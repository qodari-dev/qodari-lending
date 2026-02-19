import {
  calculateCreditSimulation,
  findInsuranceRateRange,
  resolveInsuranceFactorFromRange,
} from '@/utils/credit-simulation';
import {
  creditProductCategories,
  creditProducts,
  db,
  identificationTypes,
  insuranceCompanies,
  loanApplications,
  loans,
  paymentFrequencies,
  thirdParties,
} from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { calculatePaymentCapacity } from '@/utils/payment-capacity';
import { resolvePaymentFrequencyIntervalDays } from '@/utils/payment-frequency';
import { roundMoney, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { contract } from '../contracts';

export const creditSimulation = tsr.router(contract.creditSimulation, {
  calculate: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

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
          product.insuranceRangeMetric === 'INSTALLMENT_COUNT' ? body.installments : body.creditAmount;

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
        principal: body.creditAmount,
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

      const paymentCapacity = calculatePaymentCapacity({
        income: body.income,
        expenses: body.expenses,
      });
      const maxInstallmentPayment = calculation.summary.maxInstallmentPayment;
      const capacityGap = roundMoney(paymentCapacity - maxInstallmentPayment);
      const isWithinCapacity = maxInstallmentPayment <= paymentCapacity;

      const warningMessage = isWithinCapacity
        ? null
        : `La cuota maxima (${maxInstallmentPayment.toFixed(2)}) supera la capacidad de pago (${paymentCapacity.toFixed(2)}).`;

      return {
        status: 200 as const,
        body: {
          financingType: product.financingType,
          financingFactor,
          insuranceFactor,
          insuranceRateType,
          capacity: {
            paymentCapacity,
            maxInstallmentPayment,
            isWithinCapacity,
            capacityGap,
            warningMessage,
          },
          summary: calculation.summary,
          installments: calculation.installments,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al calcular simulacion de credito',
      });
    }
  },
  workerStudy: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const identificationType = await db.query.identificationTypes.findFirst({
        where: and(
          eq(identificationTypes.id, body.identificationTypeId),
          eq(identificationTypes.isActive, true)
        ),
      });

      if (!identificationType) {
        throwHttpError({
          status: 404,
          message: 'Tipo de identificacion no encontrado',
          code: 'NOT_FOUND',
        });
      }

      const documentNumber = body.documentNumber.trim();
      const normalizedDocumentNumber = documentNumber.replace(/\D/g, '');

      let workerThirdParty = await db.query.thirdParties.findFirst({
        where: and(
          eq(thirdParties.identificationTypeId, body.identificationTypeId),
          eq(thirdParties.documentNumber, documentNumber)
        ),
      });

      if (!workerThirdParty && normalizedDocumentNumber.length >= 3) {
        workerThirdParty = await db.query.thirdParties.findFirst({
          where: and(
            eq(thirdParties.identificationTypeId, body.identificationTypeId),
            sql`regexp_replace(${thirdParties.documentNumber}, '[^0-9]', '', 'g') = ${normalizedDocumentNumber}`
          ),
        });
      }

      let loanApplicationRows: Array<{
        id: number;
        creditNumber: string;
        applicationDate: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
        requestedAmount: string;
        approvedAmount: string | null;
        creditProduct: { name: string } | null;
      }> = [];
      let creditRows: Array<{
        id: number;
        creditNumber: string;
        loanApplicationId: number;
        recordDate: string;
        creditStartDate: string;
        status:
          | 'ACTIVE'
          | 'GENERATED'
          | 'INACTIVE'
          | 'ACCOUNTED'
          | 'VOID'
          | 'RELIQUIDATED'
          | 'FINISHED'
          | 'PAID';
        disbursementStatus: 'LIQUIDATED' | 'SENT_TO_ACCOUNTING' | 'SENT_TO_BANK' | 'DISBURSED';
        principalAmount: string;
        loanApplication: {
          creditProduct: { name: string } | null;
        } | null;
      }> = [];

      if (workerThirdParty) {
        [loanApplicationRows, creditRows] = await Promise.all([
          db.query.loanApplications.findMany({
            where: eq(loanApplications.thirdPartyId, workerThirdParty.id),
            columns: {
              id: true,
              creditNumber: true,
              applicationDate: true,
              status: true,
              requestedAmount: true,
              approvedAmount: true,
            },
            with: {
              creditProduct: {
                columns: {
                  name: true,
                },
              },
            },
            orderBy: [desc(loanApplications.applicationDate), desc(loanApplications.id)],
          }),
          db.query.loans.findMany({
            where: eq(loans.thirdPartyId, workerThirdParty.id),
            columns: {
              id: true,
              creditNumber: true,
              loanApplicationId: true,
              recordDate: true,
              creditStartDate: true,
              status: true,
              disbursementStatus: true,
              principalAmount: true,
            },
            with: {
              loanApplication: {
                with: {
                  creditProduct: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: [desc(loans.recordDate), desc(loans.id)],
          }),
        ]);
      }

      const creditBalances = await Promise.all(
        creditRows.map((credit) => getLoanBalanceSummary(credit.id))
      );

      const studiedLoanApplications = loanApplicationRows.map((item) => ({
        id: item.id,
        creditNumber: item.creditNumber,
        applicationDate: item.applicationDate,
        status: item.status,
        requestedAmount: toNumber(item.requestedAmount),
        approvedAmount: item.approvedAmount ? toNumber(item.approvedAmount) : null,
        creditProductName: item.creditProduct?.name ?? null,
      }));

      const studiedCredits = creditRows.map((item, index) => {
        const summary = creditBalances[index];
        const currentBalance = toNumber(summary.currentBalance);
        const overdueBalance = toNumber(summary.overdueBalance);

        const paymentBehavior: 'PAID' | 'CURRENT' | 'OVERDUE' =
          item.status === 'PAID' || currentBalance <= 0.01
            ? 'PAID'
            : overdueBalance > 0.01
              ? 'OVERDUE'
              : 'CURRENT';

        return {
          id: item.id,
          creditNumber: item.creditNumber,
          loanApplicationId: item.loanApplicationId,
          recordDate: item.recordDate,
          creditStartDate: item.creditStartDate,
          status: item.status,
          disbursementStatus: item.disbursementStatus,
          principalAmount: toNumber(item.principalAmount),
          currentBalance,
          overdueBalance,
          totalPaid: toNumber(summary.totalPaid),
          openInstallments: summary.openInstallments,
          nextDueDate: summary.nextDueDate,
          paymentBehavior,
          creditProductName: item.loanApplication?.creditProduct?.name ?? null,
        };
      });

      const workerFullName = workerThirdParty
        ? workerThirdParty.personType === 'LEGAL'
          ? workerThirdParty.businessName?.trim() || 'Afiliado demo'
          : [
              workerThirdParty.firstName,
              workerThirdParty.secondName,
              workerThirdParty.firstLastName,
              workerThirdParty.secondLastName,
            ]
              .filter((value): value is string => Boolean(value?.trim()))
              .join(' ')
              .trim() || 'Afiliado demo'
        : 'Afiliado demo';

      // TODO(worker-study): conectar con el modulo de subsidio para consultar data real:
      // - historial de aportes del afiliado
      // - historial de empresas aportantes
      // - trayectoria laboral
      // - salario historico y salario actual
      // Esta respuesta mock existe solo para soportar la captura de presentacion.
      const documentTail = Number(body.documentNumber.replace(/\D/g, '').slice(-2) || '0');
      const salaryBase = 1800000 + documentTail * 15000;
      const currentSalary = roundMoney(salaryBase);
      const averageSalaryLastSixMonths = roundMoney(salaryBase * 0.96);
      const highestSalaryLastSixMonths = roundMoney(salaryBase * 1.08);

      return {
        status: 200 as const,
        body: {
          worker: {
            fullName: workerFullName,
            identificationTypeId: identificationType.id,
            identificationTypeCode: identificationType.code,
            identificationTypeName: identificationType.name,
            documentNumber: workerThirdParty?.documentNumber ?? documentNumber,
          },
          salary: {
            currentSalary,
            averageSalaryLastSixMonths,
            highestSalaryLastSixMonths,
          },
          trajectory: {
            totalContributionMonths: 92,
            currentCompanyName: workerThirdParty?.employerBusinessName ?? 'Servicios Integrales SAS',
            previousCompanyName: workerThirdParty?.employerBusinessName
              ? null
              : 'Comercial Andina LTDA',
          },
          contributions: [
            {
              period: '2025-09',
              companyName: 'Servicios Integrales SAS',
              contributionBaseSalary: currentSalary,
              contributionValue: roundMoney(currentSalary * 0.04),
            },
            {
              period: '2025-10',
              companyName: 'Servicios Integrales SAS',
              contributionBaseSalary: currentSalary,
              contributionValue: roundMoney(currentSalary * 0.04),
            },
            {
              period: '2025-11',
              companyName: 'Servicios Integrales SAS',
              contributionBaseSalary: currentSalary,
              contributionValue: roundMoney(currentSalary * 0.04),
            },
            {
              period: '2025-12',
              companyName: 'Servicios Integrales SAS',
              contributionBaseSalary: currentSalary,
              contributionValue: roundMoney(currentSalary * 0.04),
            },
            {
              period: '2026-01',
              companyName: 'Servicios Integrales SAS',
              contributionBaseSalary: currentSalary,
              contributionValue: roundMoney(currentSalary * 0.04),
            },
            {
              period: '2026-02',
              companyName: 'Servicios Integrales SAS',
              contributionBaseSalary: currentSalary,
              contributionValue: roundMoney(currentSalary * 0.04),
            },
          ],
          companyHistory: [
            {
              companyName: 'Servicios Integrales SAS',
              fromDate: '2022-03-01',
              toDate: null,
              contributionMonths: 47,
            },
            {
              companyName: 'Comercial Andina LTDA',
              fromDate: '2018-01-01',
              toDate: '2022-02-28',
              contributionMonths: 50,
            },
          ],
          loanApplications: studiedLoanApplications,
          credits: studiedCredits,
          notes: workerThirdParty
            ? `Solicitudes encontradas: ${studiedLoanApplications.length}. Creditos encontrados: ${studiedCredits.length}.`
            : 'No se encontro un tercero registrado para este documento. Se muestran datos demo de trayectoria y salario.',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al consultar estudio de trabajador',
      });
    }
  },
});
