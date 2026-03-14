import {
  calculateCreditSimulation,
  findInsuranceRateRange,
  resolveInsuranceFactorFromRange,
} from '@/utils/credit-simulation';
import {
  accountingDistributionLines,
  accountingEntries,
  billingConceptRules,
  creditProductBillingConcepts,
  creditProductCategories,
  creditProductRefinancePolicies,
  creditProducts,
  creditsSettings,
  db,
  insuranceCompanies,
  loanBillingConcepts,
  loanInstallments,
  loanRefinancingLinks,
  loanStatusHistory,
  loans,
  paymentFrequencies,
} from '@/server/db';
import { calculateOneTimeConceptAmount } from '@/server/utils/accounting-utils';
import { pickApplicableBillingRule } from '@/server/utils/billing-concept-resolver';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { buildLoanLiquidationArtifacts } from '@/server/utils/loan-liquidation-artifacts';
import { createRefinancingPayoff } from '@/server/utils/loan-refinancing-payoff';
import { buildLiquidationDocumentCode } from '@/server/utils/accounting-utils';
import { recordLoanDisbursementEvent } from '@/server/utils/loan-disbursement-events';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { ensureUniqueCreditNumber } from '@/server/services/loan-applications/loan-application-validation-service';
import { resolvePaymentFrequencyIntervalDays } from '@/utils/payment-frequency';
import { getThirdPartyLabel } from '@/utils/third-party';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { contract } from '../contracts';

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
            fullName: getThirdPartyLabel(originLoan.borrower),
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

  process: async ({ body }, { request, appRoute }) => {
    try {
      const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      const { userId, userName } = getRequiredUserContext(session!);
      const today = formatDateOnly(new Date());

      // ── 1. Load credits settings ───────────────────────────────────────
      const settings = await db.query.creditsSettings.findFirst({
        columns: { refinancingReceiptTypeId: true },
      });

      if (!settings?.refinancingReceiptTypeId) {
        throwHttpError({
          status: 400,
          message: 'No se ha configurado el tipo de recibo para refinanciacion en la configuracion de creditos',
          code: 'BAD_REQUEST',
        });
      }

      const refinancingReceiptTypeId = settings.refinancingReceiptTypeId;

      // ── 2. Load origin loan ────────────────────────────────────────────
      const originLoan = await db.query.loans.findFirst({
        where: eq(loans.id, body.originLoanId),
        with: {
          borrower: true,
          affiliationOffice: true,
        },
      });

      if (!originLoan) {
        throwHttpError({ status: 404, message: 'Credito origen no encontrado', code: 'NOT_FOUND' });
      }

      // ── 3. Load selected loans ─────────────────────────────────────────
      const selectedLoanIds = Array.from(new Set([body.originLoanId, ...body.selectedLoanIds]));
      const selectedLoans = await db.query.loans.findMany({
        where: inArray(loans.id, selectedLoanIds),
        with: { borrower: true },
      });

      if (selectedLoans.length !== selectedLoanIds.length) {
        throwHttpError({
          status: 404,
          message: 'Uno o mas creditos seleccionados no existen',
          code: 'NOT_FOUND',
        });
      }

      // ── 4. Validations ─────────────────────────────────────────────────
      const invalidBorrower = selectedLoans.find(
        (loan) => loan.thirdPartyId !== originLoan.thirdPartyId
      );
      if (invalidBorrower) {
        throwHttpError({
          status: 400,
          message: 'Solo puede refinanciar creditos del mismo titular',
          code: 'BAD_REQUEST',
        });
      }

      for (const loan of selectedLoans) {
        if (['VOID', 'PAID', 'REFINANCED'].includes(loan.status)) {
          throwHttpError({
            status: 400,
            message: `El credito ${loan.creditNumber} no es elegible para refinanciacion (estado: ${loan.status})`,
            code: 'BAD_REQUEST',
          });
        }
        if (loan.status !== 'ACCOUNTED' || loan.disbursementStatus !== 'DISBURSED') {
          throwHttpError({
            status: 400,
            message: `El credito ${loan.creditNumber} debe estar contabilizado y desembolsado para refinanciar`,
            code: 'BAD_REQUEST',
          });
        }
      }

      // ── 5. Load product + refinance policy ─────────────────────────────
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
        throwHttpError({ status: 404, message: 'Linea de credito no encontrada', code: 'NOT_FOUND' });
      }
      if (!paymentFrequency) {
        throwHttpError({ status: 404, message: 'Periodicidad de pago no encontrada', code: 'NOT_FOUND' });
      }

      const refinancePolicy = await db.query.creditProductRefinancePolicies.findFirst({
        where: and(
          eq(creditProductRefinancePolicies.creditProductId, body.creditProductId),
          eq(creditProductRefinancePolicies.isActive, true)
        ),
      });

      if (!refinancePolicy?.allowRefinance) {
        throwHttpError({
          status: 400,
          message: 'La linea de credito no permite refinanciacion',
          code: 'BAD_REQUEST',
        });
      }

      if (selectedLoanIds.length > 1) {
        if (!refinancePolicy.allowConsolidation) {
          throwHttpError({
            status: 400,
            message: 'La linea de credito no permite consolidacion de creditos',
            code: 'BAD_REQUEST',
          });
        }
        if (selectedLoanIds.length > refinancePolicy.maxLoansToConsolidate) {
          throwHttpError({
            status: 400,
            message: `Maximo ${refinancePolicy.maxLoansToConsolidate} creditos para consolidar`,
            code: 'BAD_REQUEST',
          });
        }
      }

      // ── 6. Validate eligibility per loan ───────────────────────────────
      const selectedLoanSummaries = await Promise.all(
        selectedLoans.map(async (loan) => ({
          loan,
          summary: await getLoanBalanceSummary(loan.id),
        }))
      );

      for (const { loan, summary } of selectedLoanSummaries) {
        const loanAgeDays = Math.floor(
          (Date.now() - new Date(loan.creditStartDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (loanAgeDays < refinancePolicy.minLoanAgeDays) {
          throwHttpError({
            status: 400,
            message: `El credito ${loan.creditNumber} no cumple la antiguedad minima (${refinancePolicy.minLoanAgeDays} dias)`,
            code: 'BAD_REQUEST',
          });
        }

        // Compute days past due from overdue balance and next due date
        if (toNumber(summary.overdueBalance) > 0 && summary.nextDueDate) {
          const daysPastDue = Math.floor(
            (Date.now() - new Date(summary.nextDueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysPastDue > refinancePolicy.maxDaysPastDue) {
            throwHttpError({
              status: 400,
              message: `El credito ${loan.creditNumber} excede los dias de mora permitidos (${refinancePolicy.maxDaysPastDue})`,
              code: 'BAD_REQUEST',
            });
          }
        }

        // Compute paid installments from total minus open
        const paidInstallments = loan.installments - summary.openInstallments;
        if (paidInstallments < refinancePolicy.minPaidInstallments) {
          throwHttpError({
            status: 400,
            message: `El credito ${loan.creditNumber} no cumple el minimo de cuotas pagadas (${refinancePolicy.minPaidInstallments})`,
            code: 'BAD_REQUEST',
          });
        }

        const existingRefinanceCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(loanRefinancingLinks)
          .where(eq(loanRefinancingLinks.referenceLoanId, loan.id));

        if ((existingRefinanceCount[0]?.count ?? 0) >= refinancePolicy.maxRefinanceCount) {
          throwHttpError({
            status: 400,
            message: `El credito ${loan.creditNumber} ya alcanzo el maximo de refinanciaciones (${refinancePolicy.maxRefinanceCount})`,
            code: 'BAD_REQUEST',
          });
        }
      }

      // ── 7. Payment frequency + category validation ─────────────────────
      const paymentFrequencyIntervalDays = resolvePaymentFrequencyIntervalDays({
        scheduleMode: paymentFrequency.scheduleMode,
        intervalDays: paymentFrequency.intervalDays,
        dayOfMonth: paymentFrequency.dayOfMonth,
        semiMonthDay1: paymentFrequency.semiMonthDay1,
        semiMonthDay2: paymentFrequency.semiMonthDay2,
      });

      if (paymentFrequencyIntervalDays <= 0) {
        throwHttpError({ status: 400, message: 'Periodicidad de pago no valida', code: 'BAD_REQUEST' });
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
          message: 'No existe categoria configurada para la linea y el rango de cuotas seleccionado',
          code: 'NOT_FOUND',
        });
      }

      // ── 8. Calculate balances + principal to refinance ──────────────────
      const selectedLoanRows = selectedLoanSummaries.map(({ loan, summary }) => ({
        loanId: loan.id,
        creditNumber: loan.creditNumber,
        currentBalance: toNumber(summary.currentBalance),
        currentDueBalance: toNumber(summary.currentDueBalance),
      }));

      const totalCurrentBalance = roundMoney(
        selectedLoanRows.reduce((acc, item) => acc + item.currentBalance, 0)
      );
      const totalCurrentDueBalance = roundMoney(
        selectedLoanRows.reduce((acc, item) => acc + item.currentDueBalance, 0)
      );

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

      // ── 9. Insurance ───────────────────────────────────────────────────
      let insuranceFactor = 0;
      let insuranceRatePercent = 0;
      let insuranceFixedAmount = 0;
      let insuranceMinimumAmount = 0;
      let insuranceCompanyId: number | null = null;

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
          with: { insuranceRateRanges: true },
        });

        if (!insurer) {
          throwHttpError({ status: 404, message: 'Aseguradora no encontrada', code: 'NOT_FOUND' });
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
            message: 'La aseguradora no tiene un rango de tasa aplicable',
            code: 'BAD_REQUEST',
          });
        }

        const resolved = resolveInsuranceFactorFromRange({
          range: insuranceRange,
          minimumValue: insurer.minimumValue,
        });

        insuranceFactor = resolved.insuranceFactor;
        insuranceRatePercent = resolved.insuranceRatePercent;
        insuranceFixedAmount = resolved.insuranceFixedAmount;
        insuranceMinimumAmount = resolved.insuranceMinimumAmount;
        insuranceCompanyId = body.insuranceCompanyId;
      }

      // ── 10. Billing concept snapshots (from credit product) ────────────
      const productBillingConceptRows = await db.query.creditProductBillingConcepts.findMany({
        where: and(
          eq(creditProductBillingConcepts.creditProductId, body.creditProductId),
          eq(creditProductBillingConcepts.isEnabled, true)
        ),
        with: {
          billingConcept: true,
          overrideBillingConceptRule: true,
        },
      });

      const activeProductBillingConceptRows = productBillingConceptRows.filter(
        (item) => item.billingConcept?.isActive
      );

      const conceptIds = Array.from(
        new Set(activeProductBillingConceptRows.map((item) => item.billingConceptId))
      );

      const activeRules =
        conceptIds.length > 0
          ? await db.query.billingConceptRules.findMany({
              where: and(
                inArray(billingConceptRules.billingConceptId, conceptIds),
                eq(billingConceptRules.isActive, true)
              ),
            })
          : [];

      const loanBillingConceptSnapshots = activeProductBillingConceptRows.map((item) => {
        const concept = item.billingConcept;
        if (!concept) {
          throwHttpError({
            status: 400,
            message: `Concepto de facturacion ${item.billingConceptId} no encontrado`,
            code: 'BAD_REQUEST',
          });
        }

        const selectedRule =
          item.overrideBillingConceptRule ??
          pickApplicableBillingRule({
            rules: activeRules,
            conceptId: item.billingConceptId,
            asOfDate: today,
          });

        if (!selectedRule && !concept.isSystem) {
          throwHttpError({
            status: 400,
            message: `El concepto ${concept.name} no tiene regla activa para la fecha`,
            code: 'BAD_REQUEST',
          });
        }

        const effectiveFrequency = item.overrideFrequency ?? concept.defaultFrequency;
        const effectiveFinancingMode = item.overrideFinancingMode ?? concept.defaultFinancingMode;

        if (effectiveFinancingMode !== 'BILLED_SEPARATELY' && effectiveFrequency !== 'ONE_TIME') {
          throwHttpError({
            status: 400,
            message: `Concepto "${concept.name}": ${effectiveFinancingMode} solo aplica para frecuencia unica vez`,
            code: 'BAD_REQUEST',
          });
        }

        return {
          billingConceptId: item.billingConceptId,
          sourceCreditProductConceptId: item.id,
          sourceRuleId: selectedRule?.id ?? null,
          frequency: effectiveFrequency,
          financingMode: effectiveFinancingMode,
          glAccountId: item.overrideGlAccountId ?? concept.defaultGlAccountId ?? null,
          calcMethod: concept.calcMethod,
          baseAmount: concept.baseAmount ?? null,
          rangeMetric: concept.rangeMetric ?? null,
          rate: selectedRule?.rate ?? null,
          amount: selectedRule?.amount ?? null,
          valueFrom: selectedRule?.valueFrom ?? null,
          valueTo: selectedRule?.valueTo ?? null,
          minAmount: concept.minAmount ?? null,
          maxAmount: concept.maxAmount ?? null,
          roundingMode: concept.roundingMode,
          roundingDecimals: concept.roundingDecimals,
          computedAmount: null as string | null,
        };
      });

      // ── FINANCED_IN_LOAN concepts ──────────────────────────────────────
      let totalFinancedAmount = 0;
      for (const snapshot of loanBillingConceptSnapshots) {
        if (snapshot.financingMode === 'FINANCED_IN_LOAN' && snapshot.frequency === 'ONE_TIME') {
          const conceptAmount = calculateOneTimeConceptAmount({
            concept: {
              calcMethod: snapshot.calcMethod,
              baseAmount: snapshot.baseAmount,
              rate: snapshot.rate,
              amount: snapshot.amount,
              minAmount: snapshot.minAmount,
              maxAmount: snapshot.maxAmount,
              roundingMode: snapshot.roundingMode,
              roundingDecimals: snapshot.roundingDecimals,
            },
            principal: principalToRefinance,
            firstInstallmentAmount: 0,
          });
          snapshot.computedAmount = toDecimalString(conceptAmount);
          totalFinancedAmount = roundMoney(totalFinancedAmount + conceptAmount);
        }
      }

      const effectivePrincipal = roundMoney(principalToRefinance + totalFinancedAmount);

      // ── 11. Credit simulation ──────────────────────────────────────────
      const financingFactor = toNumber(category.financingFactor);
      const schedule = calculateCreditSimulation({
        financingType: product.financingType,
        principal: effectivePrincipal,
        annualRatePercent: financingFactor,
        interestRateType: product.interestRateType,
        interestDayCountConvention: product.interestDayCountConvention,
        installments: body.installments,
        firstPaymentDate: body.firstPaymentDate,
        disbursementDate: new Date(`${today}T00:00:00`),
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

      const firstInstallment = schedule.installments[0];
      const lastInstallment = schedule.installments[schedule.installments.length - 1];

      if (!firstInstallment || !lastInstallment) {
        throwHttpError({
          status: 400,
          message: 'No fue posible generar la tabla de amortizacion',
          code: 'BAD_REQUEST',
        });
      }

      // Populate remaining ONE_TIME concept amounts
      for (const snapshot of loanBillingConceptSnapshots) {
        if (snapshot.frequency === 'ONE_TIME' && !snapshot.computedAmount) {
          const conceptAmount = calculateOneTimeConceptAmount({
            concept: {
              calcMethod: snapshot.calcMethod,
              baseAmount: snapshot.baseAmount,
              rate: snapshot.rate,
              amount: snapshot.amount,
              minAmount: snapshot.minAmount,
              maxAmount: snapshot.maxAmount,
              roundingMode: snapshot.roundingMode,
              roundingDecimals: snapshot.roundingDecimals,
            },
            principal: effectivePrincipal,
            firstInstallmentAmount: firstInstallment.payment,
          });
          snapshot.computedAmount = toDecimalString(conceptAmount);
        }
      }

      // ── 12. Load distribution lines for liquidation ────────────────────
      if (!product.capitalDistributionId) {
        throwHttpError({
          status: 400,
          message: 'La linea de credito no tiene distribucion contable de capital configurada',
          code: 'BAD_REQUEST',
        });
      }

      const distributionLines = await db.query.accountingDistributionLines.findMany({
        where: eq(
          accountingDistributionLines.accountingDistributionId,
          product.capitalDistributionId
        ),
        with: { glAccount: true },
        orderBy: [asc(accountingDistributionLines.id)],
      });

      if (!distributionLines.length) {
        throwHttpError({
          status: 400,
          message: 'La distribucion contable de capital no tiene lineas configuradas',
          code: 'BAD_REQUEST',
        });
      }

      // ── 13. Generate credit number ─────────────────────────────────────
      const officeCode =
        originLoan.affiliationOffice?.code?.trim().toUpperCase().slice(0, 5) ?? 'REFI';

      // ── 14. Single transaction ─────────────────────────────────────────
      const result = await db.transaction(async (tx) => {
        // a) Pay off origin loans
        const payoffResults: Array<{ loanId: number; creditNumber: string; payoffAmount: number }> = [];
        for (const loan of selectedLoans) {
          const payoff = await createRefinancingPayoff(tx, {
            loanId: loan.id,
            refinancingReceiptTypeId,
            userId,
            userName: userName || userId,
            payoffDate: today,
            refinancingLoanId: 0, // placeholder — updated after loan creation
          });
          payoffResults.push({
            loanId: loan.id,
            creditNumber: payoff.creditNumber,
            payoffAmount: payoff.payoffAmount,
          });
        }

        // b) Generate credit number
        const creditNumber = await ensureUniqueCreditNumber(officeCode, tx);

        // c) Create new loan
        const firstCollectionDate = formatDateOnly(body.firstPaymentDate);
        const [newLoan] = await tx
          .insert(loans)
          .values({
            creditNumber,
            createdByUserId: userId,
            createdByUserName: userName || userId,
            recordDate: today,
            bankId: originLoan.bankId,
            bankAccountType: originLoan.bankAccountType,
            bankAccountNumber: originLoan.bankAccountNumber,
            thirdPartyId: originLoan.thirdPartyId,
            payeeThirdPartyId: originLoan.thirdPartyId,
            installments: body.installments,
            creditStartDate: today,
            maturityDate: lastInstallment.dueDate,
            firstCollectionDate,
            principalAmount: toDecimalString(effectivePrincipal),
            initialTotalAmount: toDecimalString(schedule.summary.totalPayment),
            insuranceCompanyId,
            insuranceValue: toDecimalString(schedule.summary.totalInsurance),
            costCenterId: originLoan.costCenterId ?? null,
            status: 'GENERATED',
            statusDate: today,
            affiliationOfficeId: originLoan.affiliationOfficeId,
            statusChangedByUserId: userId,
            statusChangedByUserName: userName || userId,
            note: body.note ? body.note.slice(0, 255) : `Refinanciacion de credito(s) ${payoffResults.map((p) => p.creditNumber).join(', ')}`.slice(0, 255),
            paymentFrequencyId: body.paymentFrequencyId,
            channelId: originLoan.channelId,
            loanApplicationId: originLoan.loanApplicationId,
            repaymentMethodId: originLoan.repaymentMethodId,
            paymentGuaranteeTypeId: originLoan.paymentGuaranteeTypeId,
          })
          .returning();

        // d) Status history + disbursement event
        await tx.insert(loanStatusHistory).values({
          loanId: newLoan.id,
          fromStatus: null,
          toStatus: 'GENERATED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Credito generado por refinanciacion',
          metadata: {
            refinancedLoanIds: payoffResults.map((p) => p.loanId),
          },
        });

        await recordLoanDisbursementEvent(tx, {
          loanId: newLoan.id,
          eventType: 'CREATED',
          eventDate: today,
          newFirstCollectionDate: firstCollectionDate,
          newMaturityDate: lastInstallment.dueDate,
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Credito generado por refinanciacion',
        });

        // e) Insert installments
        await tx.insert(loanInstallments).values(
          schedule.installments.map((installment) => ({
            loanId: newLoan.id,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
            principalAmount: toDecimalString(installment.principal),
            interestAmount: toDecimalString(installment.interest),
            insuranceAmount: toDecimalString(installment.insurance),
            remainingPrincipal: toDecimalString(installment.closingBalance),
          }))
        );

        // f) Insert billing concept snapshots
        if (loanBillingConceptSnapshots.length) {
          await tx.insert(loanBillingConcepts).values(
            loanBillingConceptSnapshots.map((snapshot) => ({
              loanId: newLoan.id,
              ...snapshot,
            }))
          );
        }

        // g) Liquidate new loan
        const newInstallments = await tx.query.loanInstallments.findMany({
          where: eq(loanInstallments.loanId, newLoan.id),
          orderBy: [asc(loanInstallments.installmentNumber)],
        });

        const newConceptSnapshots = await tx.query.loanBillingConcepts.findMany({
          where: eq(loanBillingConcepts.loanId, newLoan.id),
          with: { glAccount: true, billingConcept: true },
        });

        const documentCode = buildLiquidationDocumentCode(newLoan.id);

        const { accountingEntriesPayload, portfolioDeltas, disbursementAmount } =
          buildLoanLiquidationArtifacts({
            loan: {
              id: newLoan.id,
              creditNumber: newLoan.creditNumber,
              costCenterId: newLoan.costCenterId,
              thirdPartyId: newLoan.thirdPartyId,
              creditStartDate: newLoan.creditStartDate,
              principalAmount: newLoan.principalAmount,
            },
            installments: newInstallments,
            distributionLines,
            loanConceptSnapshots: newConceptSnapshots,
            documentCode,
            entryDate: today,
            sourceType: 'LOAN_APPROVAL',
            sourceId: String(newLoan.id),
          });

        await tx.insert(accountingEntries).values(accountingEntriesPayload);

        await applyPortfolioDeltas(tx, {
          movementDate: today,
          deltas: portfolioDeltas,
        });

        // h) Mark loan as LIQUIDATED → ACCOUNTED → DISBURSED
        await tx
          .update(loans)
          .set({
            disbursementStatus: 'LIQUIDATED',
            disbursementAmount: toDecimalString(disbursementAmount),
          })
          .where(eq(loans.id, newLoan.id));

        await recordLoanDisbursementEvent(tx, {
          loanId: newLoan.id,
          eventType: 'LIQUIDATED',
          eventDate: today,
          fromDisbursementStatus: null,
          toDisbursementStatus: 'LIQUIDATED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Liquidacion por refinanciacion',
          metadata: { documentCode, disbursementAmount },
        });

        // Mark ACCOUNTED
        await tx
          .update(loans)
          .set({
            status: 'ACCOUNTED',
            statusDate: today,
            statusChangedByUserId: userId,
            statusChangedByUserName: userName || userId,
          })
          .where(eq(loans.id, newLoan.id));

        await tx.insert(loanStatusHistory).values({
          loanId: newLoan.id,
          fromStatus: 'GENERATED',
          toStatus: 'ACCOUNTED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Contabilizado por refinanciacion',
        });

        // Mark DISBURSED (no real disbursement)
        await tx
          .update(loans)
          .set({
            disbursementStatus: 'DISBURSED',
          })
          .where(eq(loans.id, newLoan.id));

        await recordLoanDisbursementEvent(tx, {
          loanId: newLoan.id,
          eventType: 'DISBURSED',
          eventDate: today,
          fromDisbursementStatus: 'LIQUIDATED',
          toDisbursementStatus: 'DISBURSED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Desembolso automatico por refinanciacion (sin movimiento real de fondos)',
        });

        // i) Insert refinancing links
        await tx.insert(loanRefinancingLinks).values(
          payoffResults.map((payoff) => ({
            loanId: newLoan.id,
            referenceLoanId: payoff.loanId,
            payoffAmount: toDecimalString(payoff.payoffAmount),
            createdByUserId: userId,
            createdByUserName: userName || userId,
          }))
        );

        return {
          newLoanId: newLoan.id,
          newCreditNumber: newLoan.creditNumber,
          paidOffLoans: payoffResults,
        };
      });

      return {
        status: 200 as const,
        body: result,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al procesar refinanciacion',
      });
    }
  },
});
