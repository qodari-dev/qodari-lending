import {
  calculateCreditSimulation,
  findInsuranceRateRange,
  resolveInsuranceFactorFromRange,
} from '@/utils/credit-simulation';
import {
  billingConceptRules,
  creditProductBillingConcepts,
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
import { getSubsidyWorkerStudy } from '@/server/services/subsidy/subsidy-service';
import { calculateOneTimeConceptAmount } from '@/server/utils/accounting-utils';
import { pickApplicableBillingRule } from '@/server/utils/billing-concept-resolver';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
import { formatCurrency } from '@/utils/formatters';
import { calculatePaymentCapacity } from '@/utils/payment-capacity';
import { resolvePaymentFrequencyIntervalDays } from '@/utils/payment-frequency';
import { getThirdPartyLabel } from '@/utils/third-party';
import { tsr } from '@ts-rest/serverless/next';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { contract } from '../contracts';

export const creditSimulation = tsr.router(contract.creditSimulation, {
  calculate: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const [product, paymentFrequency] = await Promise.all([
        db.query.creditProducts.findFirst({
          where: and(
            eq(creditProducts.id, body.creditProductId),
            eq(creditProducts.isActive, true)
          ),
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
          product.insuranceRangeMetric === 'INSTALLMENT_COUNT'
            ? body.installments
            : body.creditAmount;

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

      // -----------------------------------------------------------------------
      // FINANCED_IN_LOAN: resolve concepts and add to principal so the
      // amortization schedule includes interest on those amounts.
      // -----------------------------------------------------------------------
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

      const financedConceptRows = productBillingConceptRows.filter((item) => {
        if (!item.billingConcept?.isActive) return false;
        const effectiveMode =
          item.overrideFinancingMode ?? item.billingConcept.defaultFinancingMode;
        const effectiveFreq = item.overrideFrequency ?? item.billingConcept.defaultFrequency;
        return effectiveMode === 'FINANCED_IN_LOAN' && effectiveFreq === 'ONE_TIME';
      });

      const financedConceptIds = Array.from(
        new Set(financedConceptRows.map((item) => item.billingConceptId))
      );

      const financedRules =
        financedConceptIds.length > 0
          ? await db.query.billingConceptRules.findMany({
              where: and(
                inArray(billingConceptRules.billingConceptId, financedConceptIds),
                eq(billingConceptRules.isActive, true)
              ),
            })
          : [];

      const asOfDate = formatDateOnly(new Date());
      let totalFinancedAmount = 0;
      const financedConcepts: Array<{
        billingConceptId: number;
        name: string;
        amount: number;
      }> = [];

      for (const item of financedConceptRows) {
        const concept = item.billingConcept;
        if (!concept) continue;

        const selectedRule =
          item.overrideBillingConceptRule ??
          pickApplicableBillingRule({
            rules: financedRules,
            conceptId: item.billingConceptId,
            asOfDate,
          });

        if (!selectedRule && !concept.isSystem) continue;

        const conceptAmount = calculateOneTimeConceptAmount({
          concept: {
            calcMethod: concept.calcMethod,
            baseAmount: concept.baseAmount,
            rate: selectedRule?.rate ?? null,
            amount: selectedRule?.amount ?? null,
            minAmount: concept.minAmount,
            maxAmount: concept.maxAmount,
            roundingMode: concept.roundingMode,
            roundingDecimals: concept.roundingDecimals,
          },
          principal: body.creditAmount,
          firstInstallmentAmount: 0, // blocked by validation for FINANCED_IN_LOAN
        });

        if (conceptAmount > 0) {
          financedConcepts.push({
            billingConceptId: concept.id,
            name: concept.name,
            amount: conceptAmount,
          });
          totalFinancedAmount = roundMoney(totalFinancedAmount + conceptAmount);
        }
      }

      const effectivePrincipal = roundMoney(body.creditAmount + totalFinancedAmount);

      const calculation = calculateCreditSimulation({
        financingType: product.financingType,
        principal: effectivePrincipal,
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
        : `La cuota maxima (${formatCurrency(maxInstallmentPayment)}) supera la capacidad de pago (${formatCurrency(paymentCapacity)}).`;

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
          requestedCreditAmount: body.creditAmount,
          totalFinancedAmount,
          financedConcepts,
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

      type LoanAppRow = {
        id: number;
        creditNumber: string;
        applicationDate: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
        requestedAmount: string;
        approvedAmount: string | null;
        creditProduct: { name: string } | null;
      };

      type CreditRow = {
        id: number;
        creditNumber: string;
        loanApplicationId: number;
        recordDate: string;
        creditStartDate: string;
        status: 'ACTIVE' | 'GENERATED' | 'INACTIVE' | 'ACCOUNTED' | 'VOID' | 'RELIQUIDATED' | 'FINISHED' | 'PAID';
        disbursementStatus: 'LIQUIDATED' | 'SENT_TO_ACCOUNTING' | 'SENT_TO_BANK' | 'DISBURSED';
        principalAmount: string;
        loanApplication: { creditProduct: { name: string } | null } | null;
      };

      let loanApplicationRows: LoanAppRow[] = [];
      let creditRows: CreditRow[] = [];

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
                columns: { name: true },
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
                    columns: { name: true },
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

      const thirdPartyLabel = getThirdPartyLabel(workerThirdParty);
      const workerFullName = thirdPartyLabel === '-' ? documentNumber : thirdPartyLabel;
      const workerDocumentNumber = workerThirdParty?.documentNumber ?? documentNumber;
      const subsidyData = await getSubsidyWorkerStudy({
        identificationTypeCode: identificationType.code,
        documentNumber: workerDocumentNumber,
      });

      const localLoanNotes = workerThirdParty
        ? `Solicitudes encontradas: ${studiedLoanApplications.length}. Creditos encontrados: ${studiedCredits.length}.`
        : 'No se encontro un tercero registrado para este documento en creditos.';

      const subsidyNotes = subsidyData?.notes ?? [];
      if (!subsidyData) {
        subsidyNotes.push('No se encontro informacion de subsidio para este documento.');
      }

      const notes = [localLoanNotes, ...subsidyNotes].filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      );

      return {
        status: 200 as const,
        body: {
          worker: {
            fullName: subsidyData?.worker.fullName || workerFullName,
            identificationTypeId: identificationType.id,
            identificationTypeCode: identificationType.code,
            identificationTypeName: identificationType.name,
            documentNumber: subsidyData?.worker.documentNumber || workerDocumentNumber,
            currentSalary: subsidyData?.currentSalary ?? null,
            categoryCode: subsidyData?.worker.categoryCode ?? null,
            sex: subsidyData?.worker.sex ?? null,
            address: subsidyData?.worker.address ?? null,
            phone: subsidyData?.worker.phone ?? null,
            email: subsidyData?.worker.email ?? null,
          },
          subsidySource: subsidyData?.source ?? null,
          companyHistory: subsidyData?.companyHistory ?? [],
          contributions: subsidyData?.contributions ?? [],
          spouses: subsidyData?.spouses ?? [],
          beneficiaries: subsidyData?.beneficiaries ?? [],
          subsidyPayments: subsidyData?.subsidyPayments ?? [],
          loanApplications: studiedLoanApplications,
          credits: studiedCredits,
          notes: notes.length ? notes.join(' ') : null,
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
