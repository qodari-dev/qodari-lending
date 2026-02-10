import {
  agreements,
  affiliationOffices,
  billingConceptRules,
  coDebtors,
  creditProductCategories,
  creditProductBillingConcepts,
  creditProductDocuments,
  creditProducts,
  db,
  insuranceCompanies,
  loanApplicationActNumbers,
  loanApplicationCoDebtors,
  loanApplicationDocuments,
  loanApplicationPledges,
  loanApplications,
  loanAgreementHistory,
  loanBillingConcepts,
  loanApplicationStatusHistory,
  loanInstallments,
  loans,
  loanStatusHistory,
  paymentFrequencies,
  paymentGuaranteeTypes,
  rejectionReasons,
  repaymentMethods,
  thirdParties,
} from '@/server/db';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { logAudit } from '@/server/utils/audit-logger';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import {
  buildDatedFileKey,
  createSpacesPresignedGetUrl,
  createSpacesPresignedPutUrl,
} from '@/server/utils/storage/spaces-presign';
import { calculateCreditSimulation } from '@/server/utils/credit-simulation';
import {
  formatDateOnly,
  toDecimalString,
  toNumber,
  toRateString,
} from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type LoanApplicationColumn = keyof typeof loanApplications.$inferSelect;

const LOAN_APPLICATION_FIELDS: FieldMap = {
  id: loanApplications.id,
  creditNumber: loanApplications.creditNumber,
  status: loanApplications.status,
  applicationDate: loanApplications.applicationDate,
  thirdPartyId: loanApplications.thirdPartyId,
  creditProductId: loanApplications.creditProductId,
  requestedAmount: loanApplications.requestedAmount,
  createdAt: loanApplications.createdAt,
  updatedAt: loanApplications.updatedAt,
} satisfies Partial<
  Record<LoanApplicationColumn, (typeof loanApplications)[LoanApplicationColumn]>
>;

const LOAN_APPLICATION_QUERY_CONFIG: QueryConfig = {
  fields: LOAN_APPLICATION_FIELDS,
  searchFields: [loanApplications.creditNumber],
  defaultSort: { column: loanApplications.createdAt, order: 'desc' },
};

const LOAN_APPLICATION_INCLUDES = createIncludeMap<typeof db.query.loanApplications>()({
  affiliationOffice: {
    relation: 'affiliationOffice',
    config: true,
  },
  creditFund: {
    relation: 'creditFund',
    config: true,
  },
  thirdParty: {
    relation: 'thirdParty',
    config: true,
  },
  repaymentMethod: {
    relation: 'repaymentMethod',
    config: true,
  },
  bank: {
    relation: 'bank',
    config: true,
  },
  creditProduct: {
    relation: 'creditProduct',
    config: true,
  },
  paymentFrequency: {
    relation: 'paymentFrequency',
    config: true,
  },
  insuranceCompany: {
    relation: 'insuranceCompany',
    config: true,
  },
  rejectionReason: {
    relation: 'rejectionReason',
    config: true,
  },
  investmentType: {
    relation: 'investmentType',
    config: true,
  },
  channel: {
    relation: 'channel',
    config: true,
  },
  paymentGuaranteeType: {
    relation: 'paymentGuaranteeType',
    config: true,
  },
  loanApplicationCoDebtors: {
    relation: 'loanApplicationCoDebtors',
    config: {
      with: {
        coDebtor: {
          with: {
            identificationType: true,
            homeCity: true,
            workCity: true,
          },
        },
      },
    },
  },
  loanApplicationDocuments: {
    relation: 'loanApplicationDocuments',
    config: {
      with: {
        documentType: true,
      },
    },
  },
  loanApplicationPledges: {
    relation: 'loanApplicationPledges',
    config: true,
  },
  loanApplicationStatusHistory: {
    relation: 'loanApplicationStatusHistory',
    config: {
      orderBy: [desc(loanApplicationStatusHistory.changedAt)],
    },
  },
});

async function resolveCategoryAndFinancingFactor(args: {
  creditProductId: number;
  categoryCode: string;
  installments: number;
}) {
  const category = await db.query.creditProductCategories.findFirst({
    where: and(
      eq(creditProductCategories.creditProductId, args.creditProductId),
      eq(
        creditProductCategories.categoryCode,
        args.categoryCode as typeof creditProductCategories.$inferSelect.categoryCode
      ),
      lte(creditProductCategories.installmentsFrom, args.installments),
      gte(creditProductCategories.installmentsTo, args.installments)
    ),
  });

  if (!category) {
    throwHttpError({
      status: 404,
      message: 'No existe categoria configurada para la linea y el rango de cuotas seleccionado',
      code: 'NOT_FOUND',
    });
  }

  return {
    category,
    financingFactor: toNumber(category.financingFactor),
  };
}

async function resolveInsuranceFactor(args: {
  creditProductId: number;
  insuranceCompanyId: number | null | undefined;
  installments: number;
  requestedAmount: number;
}) {
  const product = await db.query.creditProducts.findFirst({
    where: and(eq(creditProducts.id, args.creditProductId), eq(creditProducts.isActive, true)),
  });

  if (!product) {
    throwHttpError({
      status: 404,
      message: 'Linea de credito no encontrada',
      code: 'NOT_FOUND',
    });
  }

  if (!product.paysInsurance) {
    return { product, insuranceFactor: 0, insuranceCompanyId: null };
  }

  if (!args.insuranceCompanyId) {
    throwHttpError({
      status: 400,
      message: 'Debe seleccionar una aseguradora para esta linea de credito',
      code: 'BAD_REQUEST',
    });
  }

  const insurer = await db.query.insuranceCompanies.findFirst({
    where: and(
      eq(insuranceCompanies.id, args.insuranceCompanyId),
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
    product.insuranceRangeMetric === 'INSTALLMENT_COUNT' ? args.installments : args.requestedAmount;

  const insuranceRange = insurer.insuranceRateRanges.find(
    (range) =>
      range.rangeMetric === product.insuranceRangeMetric &&
      metricValue >= range.valueFrom &&
      metricValue <= range.valueTo
  );

  const insuranceFactor = insuranceRange
    ? toNumber(insuranceRange.rateValue)
    : toNumber(insurer.factor);

  return {
    product,
    insuranceFactor,
    insuranceCompanyId: insurer.id,
  };
}

async function validateRequiredDocuments(args: {
  creditProductId: number;
  documents: {
    documentTypeId: number;
    isDelivered: boolean;
    fileKey?: string | null;
  }[];
}) {
  const requiredDocs = await db.query.creditProductDocuments.findMany({
    where: and(
      eq(creditProductDocuments.creditProductId, args.creditProductId),
      eq(creditProductDocuments.isRequired, true)
    ),
  });

  if (!requiredDocs.length) return;

  const submittedByType = new Map<number, { isDelivered: boolean; fileKey?: string | null }>();
  for (const doc of args.documents) {
    submittedByType.set(doc.documentTypeId, doc);
  }

  for (const requiredDoc of requiredDocs) {
    const submitted = submittedByType.get(requiredDoc.documentTypeId);
    if (!submitted || !submitted.isDelivered || !submitted.fileKey) {
      throwHttpError({
        status: 400,
        message: `Debe adjuntar todos los documentos obligatorios del tipo de credito`,
        code: 'BAD_REQUEST',
      });
    }
  }
}

function generateCreditNumber(prefix: string): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 900 + 100);
  const normalizedPrefix = prefix.trim().toUpperCase().slice(0, 5);
  return `${normalizedPrefix}${yy}${mm}${dd}${hh}${mi}${ss}${rnd}`;
}

function pickApplicableBillingRule(args: {
  rules: Array<{
    id: number;
    billingConceptId: number;
    priority: number;
    calcMethod: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'TIERED';
    baseAmount: 'DISBURSED_AMOUNT' | 'PRINCIPAL' | 'OUTSTANDING_BALANCE' | 'INSTALLMENT_AMOUNT' | null;
    rate: string | null;
    amount: string | null;
    valueFrom: string | null;
    valueTo: string | null;
    minAmount: string | null;
    maxAmount: string | null;
    roundingMode: 'NEAREST' | 'UP' | 'DOWN';
    roundingDecimals: number;
    effectiveFrom: string | Date | null;
    effectiveTo: string | Date | null;
  }>;
  conceptId: number;
  asOfDate: string;
}) {
  const toDateOnly = (value: string | Date | null) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return formatDateOnly(value);
  };

  const applicable = args.rules.filter((rule) => {
    if (rule.billingConceptId !== args.conceptId) return false;
    const effectiveFrom = toDateOnly(rule.effectiveFrom);
    const effectiveTo = toDateOnly(rule.effectiveTo);
    if (effectiveFrom && effectiveFrom > args.asOfDate) return false;
    if (effectiveTo && effectiveTo < args.asOfDate) return false;
    return true;
  });

  if (!applicable.length) return null;

  applicable.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.id - a.id;
  });

  return applicable[0] ?? null;
}

async function ensureUniqueCreditNumber(prefix: string) {
  for (let i = 0; i < 5; i += 1) {
    const creditNumber = generateCreditNumber(prefix);
    const exists = await db.query.loanApplications.findFirst({
      where: eq(loanApplications.creditNumber, creditNumber),
      columns: { id: true },
    });
    if (!exists) {
      return creditNumber;
    }
  }

  throwHttpError({
    status: 500,
    message: 'No fue posible generar consecutivo para la solicitud',
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export const loanApplication = tsr.router(contract.loanApplication, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, LOAN_APPLICATION_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.loanApplications.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, LOAN_APPLICATION_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(loanApplications)
          .where(whereClause),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      return {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar solicitudes de credito',
      });
    }
  },

  listActNumbers: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const today = formatDateOnly(new Date());

      let todayAct = await db.query.loanApplicationActNumbers.findFirst({
        where: and(
          eq(loanApplicationActNumbers.affiliationOfficeId, query.affiliationOfficeId),
          eq(loanApplicationActNumbers.actDate, today)
        ),
      });

      if (!todayAct) {
        const generatedActNumber = `ACT${today.replaceAll('-', '')}${String(query.affiliationOfficeId).padStart(3, '0')}`;

        const [createdAct] = await db
          .insert(loanApplicationActNumbers)
          .values({
            affiliationOfficeId: query.affiliationOfficeId,
            actDate: today,
            actNumber: generatedActNumber,
          })
          .onConflictDoNothing({
            target: [
              loanApplicationActNumbers.affiliationOfficeId,
              loanApplicationActNumbers.actDate,
            ],
          })
          .returning();

        todayAct =
          createdAct ??
          (await db.query.loanApplicationActNumbers.findFirst({
            where: and(
              eq(loanApplicationActNumbers.affiliationOfficeId, query.affiliationOfficeId),
              eq(loanApplicationActNumbers.actDate, today)
            ),
          }));
      }

      const rows = await db.query.loanApplicationActNumbers.findMany({
        where: eq(loanApplicationActNumbers.affiliationOfficeId, query.affiliationOfficeId),
        orderBy: [desc(loanApplicationActNumbers.actDate), desc(loanApplicationActNumbers.id)],
        limit: query.limit ?? 50,
      });

      const uniqueByActNumber = new Map<string, (typeof rows)[number]>();
      if (todayAct) {
        uniqueByActNumber.set(todayAct.actNumber, todayAct);
      }
      for (const row of rows) {
        if (!uniqueByActNumber.has(row.actNumber)) {
          uniqueByActNumber.set(row.actNumber, row);
        }
      }

      return {
        status: 200 as const,
        body: Array.from(uniqueByActNumber.values()),
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar actas de solicitud',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const application = await db.query.loanApplications.findFirst({
        where: eq(loanApplications.id, id),
        with: buildTypedIncludes(query?.include, LOAN_APPLICATION_INCLUDES),
      });

      if (!application) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: application };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener solicitud de credito ${id}`,
      });
    }
  },

  create: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const { userId, userName } = getRequiredUserContext(session);

      const requestedAmount = toNumber(body.requestedAmount);
      const { financingFactor } = await resolveCategoryAndFinancingFactor({
        creditProductId: body.creditProductId,
        categoryCode: body.categoryCode,
        installments: body.installments,
      });

      const { product, insuranceFactor, insuranceCompanyId } = await resolveInsuranceFactor({
        creditProductId: body.creditProductId,
        insuranceCompanyId: body.insuranceCompanyId,
        installments: body.installments,
        requestedAmount,
      });

      const documentsData = body.loanApplicationDocuments ?? [];
      await validateRequiredDocuments({
        creditProductId: body.creditProductId,
        documents: documentsData,
      });

      const pledgesData = body.pledgesSubsidy ? (body.loanApplicationPledges ?? []) : [];

      const office = await db.query.affiliationOffices.findFirst({
        where: eq(affiliationOffices.id, body.affiliationOfficeId),
        columns: {
          code: true,
        },
      });

      if (!office) {
        throwHttpError({
          status: 404,
          message: 'Oficina de afiliacion no encontrada',
          code: 'NOT_FOUND',
        });
      }

      const officeCode = office?.code?.trim().toUpperCase();
      if (!officeCode) {
        throwHttpError({
          status: 400,
          message: 'La oficina de afiliacion no tiene codigo configurado',
          code: 'BAD_REQUEST',
        });
      }

      const creditNumber = await ensureUniqueCreditNumber(officeCode);
      const statusDate = formatDateOnly(new Date());

      const [created] = await db.transaction(async (tx) => {
        const [application] = await tx
          .insert(loanApplications)
          .values({
            creditNumber,
            creditFundId: product.creditFundId,
            channelId: body.channelId,
            applicationDate: formatDateOnly(body.applicationDate),
            affiliationOfficeId: body.affiliationOfficeId,
            createdByUserId: userId,
            createdByUserName: userName || userId,
            thirdPartyId: body.thirdPartyId,
            isCategoryManual: body.isCategoryManual,
            categoryCode: body.categoryCode,
            repaymentMethodId: body.repaymentMethodId ?? null,
            paymentGuaranteeTypeId: body.paymentGuaranteeTypeId ?? null,
            pledgesSubsidy: body.pledgesSubsidy,
            salary: toDecimalString(body.salary),
            otherIncome: toDecimalString(body.otherIncome),
            otherCredits: toDecimalString(body.otherCredits),
            paymentCapacity: toDecimalString(body.paymentCapacity),
            bankAccountNumber: body.bankAccountNumber,
            bankAccountType: body.bankAccountType,
            bankId: body.bankId,
            creditProductId: body.creditProductId,
            paymentFrequencyId: body.paymentFrequencyId ?? null,
            financingFactor: toRateString(financingFactor),
            installments: body.installments,
            insuranceCompanyId,
            insuranceFactor: toRateString(insuranceFactor),
            requestedAmount: toDecimalString(body.requestedAmount),
            investmentTypeId: body.investmentTypeId ?? null,
            status: 'PENDING',
            statusChangedByUserId: userId,
            statusDate,
            note: body.note ?? null,
            statusNote: null,
            isInsuranceApproved: body.isInsuranceApproved ?? false,
            creditStudyFee: toDecimalString(body.creditStudyFee ?? '0'),
          })
          .returning();

        const coDebtorsData = body.loanApplicationCoDebtors ?? [];
        if (coDebtorsData.length) {
          const coDebtorIds: number[] = [];
          for (const coDebtorInput of coDebtorsData) {
            const existingCoDebtor = await tx.query.coDebtors.findFirst({
              where: and(
                eq(coDebtors.identificationTypeId, coDebtorInput.identificationTypeId),
                eq(coDebtors.documentNumber, coDebtorInput.documentNumber)
              ),
              columns: { id: true },
            });

            if (existingCoDebtor) {
              const [updatedCoDebtor] = await tx
                .update(coDebtors)
                .set({
                  homeAddress: coDebtorInput.homeAddress,
                  homeCityId: coDebtorInput.homeCityId,
                  homePhone: coDebtorInput.homePhone,
                  companyName: coDebtorInput.companyName,
                  workAddress: coDebtorInput.workAddress,
                  workCityId: coDebtorInput.workCityId,
                  workPhone: coDebtorInput.workPhone,
                })
                .where(eq(coDebtors.id, existingCoDebtor.id))
                .returning({ id: coDebtors.id });
              coDebtorIds.push(updatedCoDebtor.id);
            } else {
              const [createdCoDebtor] = await tx
                .insert(coDebtors)
                .values(coDebtorInput)
                .returning({ id: coDebtors.id });
              coDebtorIds.push(createdCoDebtor.id);
            }
          }

          await tx.insert(loanApplicationCoDebtors).values(
            [...new Set(coDebtorIds)].map((coDebtorId) => ({
              loanApplicationId: application.id,
              coDebtorId,
            }))
          );
        }

        if (documentsData.length) {
          await tx.insert(loanApplicationDocuments).values(
            documentsData.map((document) => ({
              loanApplicationId: application.id,
              documentTypeId: document.documentTypeId,
              isDelivered: document.isDelivered,
              fileKey: document.fileKey ?? null,
              uploadedByUserId: document.fileKey ? userId : null,
              uploadedByUserName: document.fileKey ? userId : null,
            }))
          );
        }

        if (pledgesData.length) {
          await tx.insert(loanApplicationPledges).values(
            pledgesData.map((pledge) => ({
              loanApplicationId: application.id,
              pledgeCode: pledge.pledgeCode,
              documentNumber: pledge.documentNumber ?? null,
              beneficiaryCode: pledge.beneficiaryCode,
              pledgedAmount: toDecimalString(pledge.pledgedAmount),
              effectiveDate: formatDateOnly(pledge.effectiveDate),
            }))
          );
        }

        await tx.insert(loanApplicationStatusHistory).values({
          loanApplicationId: application.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedByUserId: userId,
          note: 'Solicitud creada',
        });

        return [application];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: created.creditNumber,
        status: 'success',
        afterValue: {
          ...created,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear solicitud de credito',
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  update: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.loanApplications.findFirst({
        where: eq(loanApplications.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Solicitud de credito con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      if (existing.status !== 'PENDING') {
        throwHttpError({
          status: 400,
          message: 'Solo se pueden editar solicitudes en estado pendiente',
          code: 'BAD_REQUEST',
        });
      }

      const targetCreditProductId = body.creditProductId ?? existing.creditProductId;
      const targetCategoryCode = body.categoryCode ?? existing.categoryCode;
      const targetInstallments = body.installments ?? existing.installments;
      const targetRequestedAmount = toNumber(body.requestedAmount ?? existing.requestedAmount);
      const targetInsuranceCompanyId =
        body.insuranceCompanyId !== undefined
          ? body.insuranceCompanyId
          : existing.insuranceCompanyId;

      const { financingFactor } = await resolveCategoryAndFinancingFactor({
        creditProductId: targetCreditProductId,
        categoryCode: targetCategoryCode,
        installments: targetInstallments,
      });

      const { product, insuranceFactor, insuranceCompanyId } = await resolveInsuranceFactor({
        creditProductId: targetCreditProductId,
        insuranceCompanyId: targetInsuranceCompanyId,
        installments: targetInstallments,
        requestedAmount: targetRequestedAmount,
      });

      if (body.loanApplicationDocuments) {
        await validateRequiredDocuments({
          creditProductId: targetCreditProductId,
          documents: body.loanApplicationDocuments,
        });
      }

      const { userId } = getRequiredUserContext(session);

      const [updated] = await db.transaction(async (tx) => {
        const [updatedApplication] = await tx
          .update(loanApplications)
          .set({
            creditFundId: product.creditFundId,
            channelId: body.channelId ?? existing.channelId,
            applicationDate: body.applicationDate
              ? formatDateOnly(body.applicationDate)
              : existing.applicationDate,
            affiliationOfficeId: body.affiliationOfficeId ?? existing.affiliationOfficeId,
            thirdPartyId: body.thirdPartyId ?? existing.thirdPartyId,
            isCategoryManual: body.isCategoryManual ?? existing.isCategoryManual,
            categoryCode: targetCategoryCode,
            repaymentMethodId:
              body.repaymentMethodId !== undefined
                ? body.repaymentMethodId
                : existing.repaymentMethodId,
            paymentGuaranteeTypeId:
              body.paymentGuaranteeTypeId !== undefined
                ? body.paymentGuaranteeTypeId
                : existing.paymentGuaranteeTypeId,
            pledgesSubsidy: body.pledgesSubsidy ?? existing.pledgesSubsidy,
            salary: toDecimalString(body.salary ?? existing.salary),
            otherIncome: toDecimalString(body.otherIncome ?? existing.otherIncome),
            otherCredits: toDecimalString(body.otherCredits ?? existing.otherCredits),
            paymentCapacity: toDecimalString(body.paymentCapacity ?? existing.paymentCapacity),
            bankAccountNumber: body.bankAccountNumber ?? existing.bankAccountNumber,
            bankAccountType: body.bankAccountType ?? existing.bankAccountType,
            bankId: body.bankId ?? existing.bankId,
            creditProductId: targetCreditProductId,
            paymentFrequencyId:
              body.paymentFrequencyId !== undefined
                ? body.paymentFrequencyId
                : existing.paymentFrequencyId,
            financingFactor: toRateString(financingFactor),
            installments: targetInstallments,
            insuranceCompanyId,
            insuranceFactor: toRateString(insuranceFactor),
            requestedAmount: toDecimalString(body.requestedAmount ?? existing.requestedAmount),
            investmentTypeId:
              body.investmentTypeId !== undefined
                ? body.investmentTypeId
                : existing.investmentTypeId,
            note: body.note !== undefined ? body.note : existing.note,
            isInsuranceApproved: body.isInsuranceApproved ?? existing.isInsuranceApproved,
            creditStudyFee: toDecimalString(body.creditStudyFee ?? existing.creditStudyFee),
          })
          .where(eq(loanApplications.id, id))
          .returning();

        if (body.loanApplicationCoDebtors !== undefined) {
          await tx
            .delete(loanApplicationCoDebtors)
            .where(eq(loanApplicationCoDebtors.loanApplicationId, id));

          if (body.loanApplicationCoDebtors.length) {
            const coDebtorIds: number[] = [];
            for (const coDebtorInput of body.loanApplicationCoDebtors) {
              const existingCoDebtor = await tx.query.coDebtors.findFirst({
                where: and(
                  eq(coDebtors.identificationTypeId, coDebtorInput.identificationTypeId),
                  eq(coDebtors.documentNumber, coDebtorInput.documentNumber)
                ),
                columns: { id: true },
              });

              if (existingCoDebtor) {
                const [updatedCoDebtor] = await tx
                  .update(coDebtors)
                  .set({
                    homeAddress: coDebtorInput.homeAddress,
                    homeCityId: coDebtorInput.homeCityId,
                    homePhone: coDebtorInput.homePhone,
                    companyName: coDebtorInput.companyName,
                    workAddress: coDebtorInput.workAddress,
                    workCityId: coDebtorInput.workCityId,
                    workPhone: coDebtorInput.workPhone,
                  })
                  .where(eq(coDebtors.id, existingCoDebtor.id))
                  .returning({ id: coDebtors.id });
                coDebtorIds.push(updatedCoDebtor.id);
              } else {
                const [createdCoDebtor] = await tx
                  .insert(coDebtors)
                  .values(coDebtorInput)
                  .returning({ id: coDebtors.id });
                coDebtorIds.push(createdCoDebtor.id);
              }
            }

            await tx.insert(loanApplicationCoDebtors).values(
              [...new Set(coDebtorIds)].map((coDebtorId) => ({
                loanApplicationId: id,
                coDebtorId,
              }))
            );
          }
        }

        if (body.loanApplicationDocuments !== undefined) {
          await tx
            .delete(loanApplicationDocuments)
            .where(eq(loanApplicationDocuments.loanApplicationId, id));

          if (body.loanApplicationDocuments.length) {
            await tx.insert(loanApplicationDocuments).values(
              body.loanApplicationDocuments.map((document) => ({
                loanApplicationId: id,
                documentTypeId: document.documentTypeId,
                isDelivered: document.isDelivered,
                fileKey: document.fileKey ?? null,
                uploadedByUserId: document.fileKey ? userId : null,
                uploadedByUserName: document.fileKey ? userId : null,
              }))
            );
          }
        }

        const shouldUpdatePledges =
          body.loanApplicationPledges !== undefined || body.pledgesSubsidy === false;
        if (shouldUpdatePledges) {
          await tx
            .delete(loanApplicationPledges)
            .where(eq(loanApplicationPledges.loanApplicationId, id));

          const pledgesSubsidy = body.pledgesSubsidy ?? existing.pledgesSubsidy;
          const pledgesData = pledgesSubsidy ? (body.loanApplicationPledges ?? []) : [];

          if (pledgesSubsidy && pledgesData.length === 0) {
            throwHttpError({
              status: 400,
              message: 'Debe registrar al menos una pignoracion cuando aplica subsidio',
              code: 'BAD_REQUEST',
            });
          }

          if (pledgesData.length) {
            await tx.insert(loanApplicationPledges).values(
              pledgesData.map((pledge) => ({
                loanApplicationId: id,
                pledgeCode: pledge.pledgeCode,
                documentNumber: pledge.documentNumber ?? null,
                beneficiaryCode: pledge.beneficiaryCode,
                pledgedAmount: toDecimalString(pledge.pledgedAmount),
                effectiveDate: formatDateOnly(pledge.effectiveDate),
              }))
            );
          }
        }

        return [updatedApplication];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: existing.creditNumber,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        afterValue: {
          ...updated,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar solicitud de credito ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  cancel: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.loanApplications.findFirst({
        where: eq(loanApplications.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Solicitud de credito con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      if (existing.status !== 'PENDING') {
        throwHttpError({
          status: 400,
          message: 'Solo se pueden cancelar solicitudes en estado pendiente',
          code: 'BAD_REQUEST',
        });
      }

      const { userId } = getRequiredUserContext(session);
      const statusDate = formatDateOnly(new Date());

      const [updated] = await db.transaction(async (tx) => {
        const [application] = await tx
          .update(loanApplications)
          .set({
            status: 'CANCELED',
            statusDate,
            statusChangedByUserId: userId,
            statusNote: body.statusNote,
            rejectionReasonId: null,
          })
          .where(eq(loanApplications.id, id))
          .returning();

        await tx.insert(loanApplicationStatusHistory).values({
          loanApplicationId: id,
          fromStatus: existing.status,
          toStatus: 'CANCELED',
          changedByUserId: userId,
          note: body.statusNote.slice(0, 255),
        });

        return [application];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'cancel',
        resourceId: id.toString(),
        resourceLabel: existing.creditNumber,
        status: 'success',
        beforeValue: existing,
        afterValue: updated,
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al cancelar solicitud de credito ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'cancel',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  reject: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.loanApplications.findFirst({
        where: eq(loanApplications.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Solicitud de credito con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      if (existing.status !== 'PENDING') {
        throwHttpError({
          status: 400,
          message: 'Solo se pueden rechazar solicitudes en estado pendiente',
          code: 'BAD_REQUEST',
        });
      }

      const rejectionReason = await db.query.rejectionReasons.findFirst({
        where: and(
          eq(rejectionReasons.id, body.rejectionReasonId),
          eq(rejectionReasons.isActive, true)
        ),
      });

      if (!rejectionReason) {
        throwHttpError({
          status: 404,
          message: 'Motivo de rechazo no encontrado',
          code: 'NOT_FOUND',
        });
      }

      const { userId } = getRequiredUserContext(session);
      const statusDate = formatDateOnly(new Date());

      const [updated] = await db.transaction(async (tx) => {
        const [application] = await tx
          .update(loanApplications)
          .set({
            status: 'REJECTED',
            statusDate,
            statusChangedByUserId: userId,
            statusNote: body.statusNote,
            rejectionReasonId: body.rejectionReasonId,
          })
          .where(eq(loanApplications.id, id))
          .returning();

        await tx.insert(loanApplicationStatusHistory).values({
          loanApplicationId: id,
          fromStatus: existing.status,
          toStatus: 'REJECTED',
          changedByUserId: userId,
          note: body.statusNote.slice(0, 255),
          metadata: {
            rejectionReasonId: body.rejectionReasonId,
          },
        });

        return [application];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'reject',
        resourceId: id.toString(),
        resourceLabel: existing.creditNumber,
        status: 'success',
        beforeValue: existing,
        afterValue: updated,
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al rechazar solicitud de credito ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'reject',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  approve: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.loanApplications.findFirst({
        where: eq(loanApplications.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Solicitud de credito con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      if (existing.status !== 'PENDING') {
        throwHttpError({
          status: 400,
          message: 'Solo se pueden aprobar solicitudes en estado pendiente',
          code: 'BAD_REQUEST',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.loanApplicationId, id),
        columns: { id: true },
      });

      if (existingLoan) {
        throwHttpError({
          status: 409,
          message: 'La solicitud ya tiene un credito generado',
          code: 'CONFLICT',
        });
      }

      if (!existing.paymentFrequencyId) {
        throwHttpError({
          status: 400,
          message: 'La solicitud no tiene periodicidad de pago configurada',
          code: 'BAD_REQUEST',
        });
      }

      const approvedAmount = toNumber(body.approvedAmount);
      if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
        throwHttpError({
          status: 400,
          message: 'Valor aprobado invalido',
          code: 'BAD_REQUEST',
        });
      }

      const [
        repaymentMethod,
        paymentGuaranteeType,
        agreement,
        payeeThirdParty,
        product,
        paymentFrequency,
        actNumber,
      ] = await Promise.all([
        db.query.repaymentMethods.findFirst({
          where: and(
            eq(repaymentMethods.id, body.repaymentMethodId),
            eq(repaymentMethods.isActive, true)
          ),
        }),
        db.query.paymentGuaranteeTypes.findFirst({
          where: and(
            eq(paymentGuaranteeTypes.id, body.paymentGuaranteeTypeId),
            eq(paymentGuaranteeTypes.isActive, true)
          ),
        }),
        db.query.agreements.findFirst({
          where: and(eq(agreements.id, body.agreementId), eq(agreements.isActive, true)),
          columns: { id: true },
        }),
        db.query.thirdParties.findFirst({
          where: eq(thirdParties.id, body.payeeThirdPartyId),
          columns: { id: true },
        }),
        db.query.creditProducts.findFirst({
          where: and(
            eq(creditProducts.id, existing.creditProductId),
            eq(creditProducts.isActive, true)
          ),
        }),
        db.query.paymentFrequencies.findFirst({
          where: and(
            eq(paymentFrequencies.id, existing.paymentFrequencyId),
            eq(paymentFrequencies.isActive, true)
          ),
        }),
        db.query.loanApplicationActNumbers.findFirst({
          where: and(
            eq(loanApplicationActNumbers.affiliationOfficeId, existing.affiliationOfficeId),
            eq(loanApplicationActNumbers.actNumber, body.actNumber)
          ),
        }),
      ]);

      if (!repaymentMethod) {
        throwHttpError({
          status: 404,
          message: 'Forma de pago no encontrada',
          code: 'NOT_FOUND',
        });
      }

      if (!paymentGuaranteeType) {
        throwHttpError({
          status: 404,
          message: 'Tipo de garantia no encontrado',
          code: 'NOT_FOUND',
        });
      }

      if (!agreement) {
        throwHttpError({
          status: 404,
          message: 'Convenio no encontrado',
          code: 'NOT_FOUND',
        });
      }

      if (!payeeThirdParty) {
        throwHttpError({
          status: 404,
          message: 'Tercero de desembolso no encontrado',
          code: 'NOT_FOUND',
        });
      }

      if (!product) {
        throwHttpError({
          status: 404,
          message: 'Linea de credito no encontrada',
          code: 'NOT_FOUND',
        });
      }

      if (
        !paymentFrequency ||
        !paymentFrequency.daysInterval ||
        paymentFrequency.daysInterval <= 0
      ) {
        throwHttpError({
          status: 404,
          message: 'Periodicidad de pago no valida',
          code: 'NOT_FOUND',
        });
      }

      if (!actNumber) {
        throwHttpError({
          status: 404,
          message: 'Acta no encontrada para la oficina de la solicitud',
          code: 'NOT_FOUND',
        });
      }

      const schedule = calculateCreditSimulation({
        financingType: product.financingType,
        principal: approvedAmount,
        annualRatePercent: toNumber(existing.financingFactor),
        installments: existing.installments,
        firstPaymentDate: body.firstCollectionDate,
        daysInterval: paymentFrequency.daysInterval,
        insuranceRatePercent: toNumber(existing.insuranceFactor),
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

      const { userId, userName } = getRequiredUserContext(session);
      const statusDate = formatDateOnly(new Date());
      const firstCollectionDate = formatDateOnly(body.firstCollectionDate);
      const approvedDate = statusDate;

      const productBillingConceptRows = await db.query.creditProductBillingConcepts.findMany({
        where: and(
          eq(creditProductBillingConcepts.creditProductId, existing.creditProductId),
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
            asOfDate: approvedDate,
          });

        if (!selectedRule) {
          throwHttpError({
            status: 400,
            message: `El concepto ${concept.name} no tiene regla activa para la fecha de aprobacion`,
            code: 'BAD_REQUEST',
          });
        }

        return {
          billingConceptId: item.billingConceptId,
          sourceCreditProductConceptId: item.id,
          sourceRuleId: selectedRule.id,
          frequency: item.overrideFrequency ?? concept.defaultFrequency,
          financingMode: item.overrideFinancingMode ?? concept.defaultFinancingMode,
          glAccountId: item.overrideGlAccountId ?? concept.defaultGlAccountId ?? null,
          calcMethod: selectedRule.calcMethod,
          baseAmount: selectedRule.baseAmount ?? null,
          rate: selectedRule.rate ?? null,
          amount: selectedRule.amount ?? null,
          valueFrom: selectedRule.valueFrom ?? null,
          valueTo: selectedRule.valueTo ?? null,
          minAmount: selectedRule.minAmount ?? null,
          maxAmount: selectedRule.maxAmount ?? null,
          roundingMode: selectedRule.roundingMode,
          roundingDecimals: selectedRule.roundingDecimals,
        };
      });

      const [updated] = await db.transaction(async (tx) => {
        const [application] = await tx
          .update(loanApplications)
          .set({
            repaymentMethodId: body.repaymentMethodId,
            paymentGuaranteeTypeId: body.paymentGuaranteeTypeId,
            approvedAmount: toDecimalString(approvedAmount),
            actNumber: body.actNumber,
            status: 'APPROVED',
            statusDate,
            statusChangedByUserId: userId,
            rejectionReasonId: null,
            statusNote: null,
          })
          .where(eq(loanApplications.id, id))
          .returning();

        const [loan] = await tx
          .insert(loans)
          .values({
            creditNumber: existing.creditNumber,
            creditFundId: existing.creditFundId,
            createdByUserId: userId,
            createdByUserName: userName || userId,
            recordDate: statusDate,
            loanApplicationId: existing.id,
            agreementId: body.agreementId,
            thirdPartyId: existing.thirdPartyId,
            payeeThirdPartyId: body.payeeThirdPartyId,
            installments: existing.installments,
            creditStartDate: firstInstallment.dueDate,
            maturityDate: lastInstallment.dueDate,
            firstCollectionDate,
            principalAmount: toDecimalString(approvedAmount),
            initialTotalAmount: toDecimalString(schedule.summary.totalPayment),
            insuranceCompanyId: existing.insuranceCompanyId,
            insuranceValue: toDecimalString(schedule.summary.totalInsurance),
            discountStudyCredit: toNumber(existing.creditStudyFee) > 0,
            costCenterId: product.costCenterId ?? null,
            repaymentMethodId: body.repaymentMethodId,
            paymentGuaranteeTypeId: body.paymentGuaranteeTypeId,
            guaranteeDocument: existing.creditNumber,
            status: 'GENERATED',
            statusDate,
            affiliationOfficeId: existing.affiliationOfficeId,
            statusChangedByUserId: userId,
            statusChangedByUserName: userName || userId,
            note: existing.note ? existing.note.slice(0, 255) : null,
            paymentFrequencyId: existing.paymentFrequencyId,
            channelId: existing.channelId,
          })
          .returning();

        await tx.insert(loanAgreementHistory).values({
          loanId: loan.id,
          agreementId: body.agreementId,
          effectiveDate: statusDate,
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Convenio asignado al aprobar solicitud',
          metadata: {
            sourceLoanApplicationId: id,
            actNumber: body.actNumber,
          },
        });

        await tx.insert(loanStatusHistory).values({
          loanId: loan.id,
          fromStatus: null,
          toStatus: 'GENERATED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Credito generado desde aprobacion de solicitud',
          metadata: {
            sourceLoanApplicationId: id,
            actNumber: body.actNumber,
          },
        });

        await tx.insert(loanInstallments).values(
          schedule.installments.map((installment) => ({
            loanId: loan.id,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
            principalAmount: toDecimalString(installment.principal),
            interestAmount: toDecimalString(installment.interest),
            insuranceAmount: toDecimalString(installment.insurance),
            remainingPrincipal: toDecimalString(installment.closingBalance),
          }))
        );

        if (loanBillingConceptSnapshots.length) {
          await tx.insert(loanBillingConcepts).values(
            loanBillingConceptSnapshots.map((snapshot) => ({
              loanId: loan.id,
              ...snapshot,
            }))
          );
        }

        await tx.insert(loanApplicationStatusHistory).values({
          loanApplicationId: id,
          fromStatus: existing.status,
          toStatus: 'APPROVED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: `Solicitud aprobada. Acta ${body.actNumber}`.slice(0, 255),
          metadata: {
            loanId: loan.id,
            approvedAmount: toDecimalString(approvedAmount),
            actNumber: body.actNumber,
            agreementId: body.agreementId,
            payeeThirdPartyId: body.payeeThirdPartyId,
            firstCollectionDate,
          },
        });

        return [application];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'approve',
        resourceId: id.toString(),
        resourceLabel: existing.creditNumber,
        status: 'success',
        beforeValue: existing,
        afterValue: updated,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al aprobar solicitud de credito ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'approve',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  presignDocumentUpload: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const fileKey = buildDatedFileKey('loan-applications', body.fileName);
      const uploadUrl = createSpacesPresignedPutUrl(fileKey);

      return {
        status: 200 as const,
        body: {
          fileKey,
          uploadUrl,
          method: 'PUT' as const,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar URL de carga',
      });
    }
  },

  presignDocumentView: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      if (!body.fileKey.startsWith('loan-applications/')) {
        throwHttpError({
          status: 400,
          message: 'fileKey invalido',
          code: 'BAD_REQUEST',
        });
      }

      const viewUrl = createSpacesPresignedGetUrl(body.fileKey, 900);

      return {
        status: 200 as const,
        body: {
          viewUrl,
          method: 'GET' as const,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar URL de visualizacion',
      });
    }
  },
});
