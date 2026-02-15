import {
  calculateCreditSimulation,
  findInsuranceRateRange,
  resolveInsuranceFactorFromRange,
} from '@/utils/credit-simulation';
import {
  creditProductCategories,
  creditProducts,
  db,
  insuranceCompanies,
  loans,
  paymentFrequencies,
} from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { resolvePaymentFrequencyIntervalDays } from '@/utils/payment-frequency';
import { roundMoney, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { contract } from '../contracts';

function resolveBorrowerName(borrower: {
  personType?: string | null;
  businessName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  documentNumber?: string | null;
} | null) {
  if (!borrower) return '-';
  if (borrower.personType === 'LEGAL') {
    return borrower.businessName ?? borrower.documentNumber ?? '-';
  }

  const fullName = [
    borrower.firstName,
    borrower.secondName,
    borrower.firstLastName,
    borrower.secondLastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || borrower.documentNumber || '-';
}

export const loanRefinancing = tsr.router(contract.loanRefinancing, {
  simulate: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const originLoan = await db.query.loans.findFirst({
        where: eq(loans.id, body.originLoanId),
        with: {
          borrower: true,
        },
      });

      if (!originLoan) {
        throwHttpError({
          status: 404,
          message: 'Credito origen no encontrado',
          code: 'NOT_FOUND',
        });
      }

      const selectedLoanIds = Array.from(new Set([body.originLoanId, ...body.selectedLoanIds]));
      const selectedLoans = await db.query.loans.findMany({
        where: inArray(loans.id, selectedLoanIds),
        with: {
          borrower: true,
        },
      });

      if (selectedLoans.length !== selectedLoanIds.length) {
        throwHttpError({
          status: 404,
          message: 'Uno o mas creditos seleccionados no existen',
          code: 'NOT_FOUND',
        });
      }

      const invalidBorrower = selectedLoans.find((loan) => loan.thirdPartyId !== originLoan.thirdPartyId);
      if (invalidBorrower) {
        throwHttpError({
          status: 400,
          message: 'Solo puede refinanciar creditos del mismo titular',
          code: 'BAD_REQUEST',
        });
      }

      const invalidStatusLoan = selectedLoans.find((loan) => ['VOID', 'PAID'].includes(loan.status));
      if (invalidStatusLoan) {
        throwHttpError({
          status: 400,
          message: `El credito ${invalidStatusLoan.creditNumber} no es elegible para refinanciacion`,
          code: 'BAD_REQUEST',
        });
      }

      const [product, paymentFrequency] = await Promise.all([
        db.query.creditProducts.findFirst({
          where: and(eq(creditProducts.id, body.creditProductId), eq(creditProducts.isActive, true)),
        }),
        db.query.paymentFrequencies.findFirst({
          where: and(
            eq(paymentFrequencies.id, body.paymentFrequencyId),
            eq(paymentFrequencies.isActive, true)
          ),
        }),
      ]);

      if (!product) {
        throwHttpError({
          status: 404,
          message: 'Linea de credito no encontrada',
          code: 'NOT_FOUND',
        });
      }

      if (!paymentFrequency) {
        throwHttpError({
          status: 404,
          message: 'Periodicidad de pago no encontrada',
          code: 'NOT_FOUND',
        });
      }

      const paymentFrequencyIntervalDays = resolvePaymentFrequencyIntervalDays({
        scheduleMode: paymentFrequency.scheduleMode,
        intervalDays: paymentFrequency.intervalDays,
        dayOfMonth: paymentFrequency.dayOfMonth,
        semiMonthDay1: paymentFrequency.semiMonthDay1,
        semiMonthDay2: paymentFrequency.semiMonthDay2,
      });

      if (paymentFrequencyIntervalDays <= 0) {
        throwHttpError({
          status: 400,
          message: 'Periodicidad de pago no valida',
          code: 'BAD_REQUEST',
        });
      }

      if (product.maxInstallments && body.installments > product.maxInstallments) {
        throwHttpError({
          status: 400,
          message: `El numero de cuotas supera el maximo permitido (${product.maxInstallments})`,
          code: 'BAD_REQUEST',
        });
      }

      const category = await db.query.creditProductCategories.findFirst({
        where: and(
          eq(creditProductCategories.creditProductId, body.creditProductId),
          eq(creditProductCategories.categoryCode, body.categoryCode),
          lte(creditProductCategories.installmentsFrom, body.installments),
          gte(creditProductCategories.installmentsTo, body.installments)
        ),
      });

      if (!category) {
        throwHttpError({
          status: 404,
          message:
            'No existe categoria configurada para la linea y el rango de cuotas seleccionado',
          code: 'NOT_FOUND',
        });
      }

      let insuranceFactor = 0;
      let insuranceRateType: 'PERCENTAGE' | 'FIXED_AMOUNT' | null = null;
      let insuranceRatePercent = 0;
      let insuranceFixedAmount = 0;
      let insuranceMinimumAmount = 0;

      const selectedLoanSummaries = await Promise.all(
        selectedLoans.map(async (loan) => {
          const summary = await getLoanBalanceSummary(loan.id);

          return {
            loan,
            summary,
          };
        })
      );

      const selectedLoanRows = selectedLoanSummaries.map(({ loan, summary }) => ({
        loanId: loan.id,
        creditNumber: loan.creditNumber,
        status: loan.status,
        principalAmount: toNumber(loan.principalAmount),
        currentBalance: toNumber(summary.currentBalance),
        overdueBalance: toNumber(summary.overdueBalance),
        currentDueBalance: toNumber(summary.currentDueBalance),
        openInstallments: summary.openInstallments,
        nextDueDate: summary.nextDueDate,
      }));

      const totalCurrentBalance = roundMoney(
        selectedLoanRows.reduce((acc, item) => acc + item.currentBalance, 0)
      );
      const totalOverdueBalance = roundMoney(
        selectedLoanRows.reduce((acc, item) => acc + item.overdueBalance, 0)
      );
      const totalCurrentDueBalance = roundMoney(
        selectedLoanRows.reduce((acc, item) => acc + item.currentDueBalance, 0)
      );
      const totalOpenInstallments = selectedLoanRows.reduce((acc, item) => acc + item.openInstallments, 0);

      const principalToRefinance = roundMoney(
        body.includeOverdueBalance ? totalCurrentBalance : totalCurrentDueBalance
      );

      if (principalToRefinance <= 0) {
        throwHttpError({
          status: 400,
          message: 'No hay saldo para refinanciar con la seleccion actual',
          code: 'BAD_REQUEST',
        });
      }

      if (product.paysInsurance) {
        if (!body.insuranceCompanyId) {
          throwHttpError({
            status: 400,
            message: 'Debe seleccionar una aseguradora para esta linea de credito',
            code: 'BAD_REQUEST',
          });
        }

        const insurer = await db.query.insuranceCompanies.findFirst({
          where: and(
            eq(insuranceCompanies.id, body.insuranceCompanyId),
            eq(insuranceCompanies.isActive, true)
          ),
          with: {
            insuranceRateRanges: true,
          },
        });

        if (!insurer) {
          throwHttpError({
            status: 404,
            message: 'Aseguradora no encontrada',
            code: 'NOT_FOUND',
          });
        }

        const metricValue =
          product.insuranceRangeMetric === 'INSTALLMENT_COUNT'
            ? body.installments
            : principalToRefinance;

        const insuranceRange = findInsuranceRateRange({
          ranges: insurer.insuranceRateRanges,
          rangeMetric: product.insuranceRangeMetric,
          metricValue,
        });

        if (!insuranceRange) {
          throwHttpError({
            status: 400,
            message: 'La aseguradora no tiene un rango de tasa aplicable para esta simulacion',
            code: 'BAD_REQUEST',
          });
        }

        const resolvedInsurance = resolveInsuranceFactorFromRange({
          range: insuranceRange,
          minimumValue: insurer.minimumValue,
        });

        insuranceFactor = resolvedInsurance.insuranceFactor;
        insuranceRateType = resolvedInsurance.insuranceRateType;
        insuranceRatePercent = resolvedInsurance.insuranceRatePercent;
        insuranceFixedAmount = resolvedInsurance.insuranceFixedAmount;
        insuranceMinimumAmount = resolvedInsurance.insuranceMinimumAmount;
      }

      const financingFactor = toNumber(category.financingFactor);

      const calculation = calculateCreditSimulation({
        financingType: product.financingType,
        principal: principalToRefinance,
        annualRatePercent: financingFactor,
        interestRateType: product.interestRateType,
        interestDayCountConvention: product.interestDayCountConvention,
        installments: body.installments,
        firstPaymentDate: body.firstPaymentDate,
        disbursementDate: new Date(),
        daysInterval: paymentFrequencyIntervalDays,
        paymentScheduleMode: paymentFrequency.scheduleMode,
        dayOfMonth: paymentFrequency.dayOfMonth,
        semiMonthDay1: paymentFrequency.semiMonthDay1,
        semiMonthDay2: paymentFrequency.semiMonthDay2,
        useEndOfMonthFallback: paymentFrequency.useEndOfMonthFallback,
        insuranceAccrualMethod: product.insuranceAccrualMethod,
        insuranceRatePercent,
        insuranceFixedAmount,
        insuranceMinimumAmount,
      });

      const estimatedCurrentInstallment = roundMoney(
        totalOpenInstallments > 0 ? totalCurrentDueBalance / totalOpenInstallments : 0
      );
      const estimatedNewInstallment = calculation.summary.maxInstallmentPayment;

      // TODO(loan-refinancing): completar la logica real de refinanciacion:
      // - validar politica del producto (consolidacion, antiguedad, mora y maximo refinanciaciones)
      // - incluir cargos/seguros/intereses causados segun reglas de negocio
      // - generar el credito refinanciado y relacionarlo con loan_refinancing_links
      // - actualizar estado/contabilidad de creditos origen dentro de una transaccion
      return {
        status: 200 as const,
        body: {
          borrower: {
            thirdPartyId: originLoan.thirdPartyId,
            fullName: resolveBorrowerName(originLoan.borrower),
            documentNumber: originLoan.borrower?.documentNumber ?? null,
          },
          selectedLoans: selectedLoanRows,
          before: {
            totalCurrentBalance,
            totalOverdueBalance,
            totalCurrentDueBalance,
            totalOpenInstallments,
          },
          after: {
            principalToRefinance,
            financingType: product.financingType,
            financingFactor,
            insuranceFactor,
            insuranceRateType,
            projectedTotalPayment: calculation.summary.totalPayment,
            projectedFirstInstallmentPayment: calculation.summary.firstInstallmentPayment,
            projectedMaxInstallmentPayment: calculation.summary.maxInstallmentPayment,
          },
          comparison: {
            estimatedCurrentInstallment,
            estimatedNewInstallment,
            installmentDelta: roundMoney(estimatedNewInstallment - estimatedCurrentInstallment),
            debtDelta: roundMoney(principalToRefinance - totalCurrentBalance),
          },
          summary: calculation.summary,
          installments: calculation.installments,
          notes: 'Refinanciacion en modo vista previa.',
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al simular refinanciacion',
      });
    }
  },
});
