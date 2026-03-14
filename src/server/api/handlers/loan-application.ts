import {
  affiliationOffices,
  billingConceptRules,
  creditsSettings,
  creditProductBillingConcepts,
  creditProducts,
  db,
  loanApplicationActNumbers,
  loanApplicationCoDebtors,
  loanApplicationDocuments,
  loanApplicationPledges,
  loanApplicationApprovalHistory,
  loanApplicationRiskAssessments,
  loanApprovalLevels,
  loanApprovalLevelUsers,
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
import { recordLoanDisbursementEvent } from '@/server/utils/loan-disbursement-events';
import { calculateCreditSimulation } from '@/utils/credit-simulation';
import {
  formatDateOnly,
  toDecimalString,
  toNumber,
  toRateString,
  roundMoney,
} from '@/server/utils/value-utils';
import { normalizeDocumentNumber } from '@/server/utils/string-utils';
import { calculateLoanApplicationPaymentCapacity } from '@/utils/payment-capacity';
import {
  resolvePaymentFrequencyIntervalDays,
  resolveSuggestedFirstCollectionDate,
} from '@/utils/payment-frequency';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { contract } from '../contracts';
import { env } from '@/env';
import { pickApplicableBillingRule } from '@/server/utils/billing-concept-resolver';
import { calculateOneTimeConceptAmount } from '@/server/utils/accounting-utils';
import {
  approveIntermediateLevel,
  assertAssignedApprover,
  ensurePendingAssignment,
  reassignApplicationApproval,
  recordFinalApproval,
  recordRejectedOrCanceled,
  assignInitialApproval,
} from '@/server/services/loan-applications/loan-application-approval-service';
import {
  buildFallbackBeneficiaryCode,
  ensureThirdPartiesAreUpToDate,
  ensureUniqueCreditNumber,
  getPledgeSubsidyCodeSetting,
  resolveCategoryAndFinancingFactor,
  resolveInsuranceFactor,
  validateLoanApplicationAgreement,
  validateRequiredDocuments,
} from '@/server/services/loan-applications/loan-application-validation-service';
import {
  getSubsidyCurrentPeriod,
  getSubsidyWorkerStudy,
} from '@/server/services/subsidy/subsidy-service';

type LoanApplicationColumn = keyof typeof loanApplications.$inferSelect;

const LOAN_APPLICATION_FIELDS: FieldMap = {
  id: loanApplications.id,
  creditNumber: loanApplications.creditNumber,
  status: loanApplications.status,
  applicationDate: loanApplications.applicationDate,
  thirdPartyId: loanApplications.thirdPartyId,
  agreementId: loanApplications.agreementId,
  creditProductId: loanApplications.creditProductId,
  requestedAmount: loanApplications.requestedAmount,
  approvedInstallments: loanApplications.approvedInstallments,
  assignedApprovalUserId: loanApplications.assignedApprovalUserId,
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
    config: {
      with: {
        identificationType: true,
        thirdPartyType: true,
        homeCity: true,
        workCity: true,
      },
    },
  },
  agreement: {
    relation: 'agreement',
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
        thirdParty: {
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
  currentApprovalLevel: {
    relation: 'currentApprovalLevel',
    config: {
      with: {
        users: {
          orderBy: [asc(loanApprovalLevelUsers.sortOrder), asc(loanApprovalLevelUsers.id)],
        },
      },
    },
  },
  targetApprovalLevel: {
    relation: 'targetApprovalLevel',
    config: {
      with: {
        users: {
          orderBy: [asc(loanApprovalLevelUsers.sortOrder), asc(loanApprovalLevelUsers.id)],
        },
      },
    },
  },
  loanApplicationApprovalHistory: {
    relation: 'loanApplicationApprovalHistory',
    config: {
      with: {
        level: true,
      },
      orderBy: [desc(loanApplicationApprovalHistory.occurredAt)],
    },
  },
  loanApplicationStatusHistory: {
    relation: 'loanApplicationStatusHistory',
    config: {
      orderBy: [desc(loanApplicationStatusHistory.changedAt)],
    },
  },
  loanApplicationRiskAssessments: {
    relation: 'loanApplicationRiskAssessments',
    config: {
      orderBy: [desc(loanApplicationRiskAssessments.executedAt)],
    },
  },
});

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

  inbox: async ({ query }, { request, appRoute }) => {
    try {
      const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const { userId } = getRequiredUserContext(session);

      const { page, limit, search, where, sort, include } = query;
      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, LOAN_APPLICATION_QUERY_CONFIG);

      const inboxWhere = and(
        whereClause,
        eq(loanApplications.status, 'PENDING'),
        eq(loanApplications.assignedApprovalUserId, userId)
      );

      const [data, countResult] = await Promise.all([
        db.query.loanApplications.findMany({
          where: inboxWhere,
          with: buildTypedIncludes(include, LOAN_APPLICATION_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(loanApplications)
          .where(inboxWhere),
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
        genericMsg: 'Error al listar bandeja de aprobacion de solicitudes',
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

      return {
        status: 200 as const,
        body: todayAct ? [todayAct] : [],
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

  approvalLoad: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const level = await db.query.loanApprovalLevels.findFirst({
        where: eq(loanApprovalLevels.id, query.levelId),
        columns: {
          id: true,
          name: true,
          levelOrder: true,
          isActive: true,
        },
      });

      if (!level) {
        throwHttpError({
          status: 404,
          message: 'Nivel de aprobacion no encontrado',
          code: 'NOT_FOUND',
        });
      }

      const [levelUsers, pendingApplications] = await Promise.all([
        db.query.loanApprovalLevelUsers.findMany({
          where: and(
            eq(loanApprovalLevelUsers.loanApprovalLevelId, level.id),
            eq(loanApprovalLevelUsers.isActive, true)
          ),
          columns: {
            userId: true,
            userName: true,
            sortOrder: true,
          },
          orderBy: [asc(loanApprovalLevelUsers.sortOrder), asc(loanApprovalLevelUsers.id)],
        }),
        db.query.loanApplications.findMany({
          where: and(
            eq(loanApplications.status, 'PENDING'),
            eq(loanApplications.currentApprovalLevelId, level.id),
            isNotNull(loanApplications.assignedApprovalUserId)
          ),
          columns: {
            id: true,
            creditNumber: true,
            requestedAmount: true,
            applicationDate: true,
            assignedApprovalUserId: true,
            assignedApprovalUserName: true,
            approvalAssignedAt: true,
            updatedAt: true,
            createdAt: true,
          },
          orderBy: [
            asc(loanApplications.approvalAssignedAt),
            asc(loanApplications.createdAt),
            asc(loanApplications.id),
          ],
        }),
      ]);

      type ApprovalLoadUserEntry = {
        userId: string;
        userName: string;
        pendingCount: number;
        oldestAssignedAt: string | null;
        oldestPendingDays: number;
        oldestCreatedAt: string | null;
        oldestCreatedDays: number;
        applications: Array<{
          loanApplicationId: number;
          creditNumber: string;
          requestedAmount: number;
          applicationDate: string;
          assignedAt: string | null;
          createdAt: string;
          pendingDays: number;
          createdDays: number;
        }>;
      };

      const todayStr = formatDateOnly(new Date());
      const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();

      const usersMap = new Map<string, ApprovalLoadUserEntry>();

      for (const levelUser of levelUsers) {
        usersMap.set(levelUser.userId, {
          userId: levelUser.userId,
          userName: levelUser.userName,
          pendingCount: 0,
          oldestAssignedAt: null,
          oldestPendingDays: 0,
          oldestCreatedAt: null,
          oldestCreatedDays: 0,
          applications: [],
        });
      }

      for (const app of pendingApplications) {
        const assignedUserId = app.assignedApprovalUserId;
        if (!assignedUserId) continue;

        const assignedAt = app.approvalAssignedAt ?? app.createdAt;
        const assignedAtIso =
          assignedAt instanceof Date ? assignedAt.toISOString() : String(assignedAt);
        const assignedDateMs = new Date(formatDateOnly(assignedAt) + 'T00:00:00Z').getTime();
        const pendingDays = Math.max(0, Math.round((todayMs - assignedDateMs) / 86_400_000));
        const createdAtIso =
          app.createdAt instanceof Date ? app.createdAt.toISOString() : String(app.createdAt);
        const createdDateMs = new Date(formatDateOnly(app.createdAt) + 'T00:00:00Z').getTime();
        const createdDays = Math.max(0, Math.round((todayMs - createdDateMs) / 86_400_000));

        const entry: ApprovalLoadUserEntry = usersMap.get(assignedUserId) ?? {
          userId: assignedUserId,
          userName: app.assignedApprovalUserName?.trim() || assignedUserId,
          pendingCount: 0,
          oldestAssignedAt: null,
          oldestPendingDays: 0,
          oldestCreatedAt: null,
          oldestCreatedDays: 0,
          applications: [],
        };

        entry.applications.push({
          loanApplicationId: app.id,
          creditNumber: app.creditNumber,
          requestedAmount: toNumber(app.requestedAmount),
          applicationDate:
            typeof app.applicationDate === 'string'
              ? app.applicationDate
              : formatDateOnly(app.applicationDate),
          assignedAt: assignedAtIso,
          createdAt: createdAtIso,
          pendingDays,
          createdDays,
        });

        usersMap.set(assignedUserId, entry);
      }

      const users = Array.from(usersMap.values())
        .map((user) => {
          const oldestItem = user.applications[0] ?? null;
          const oldestCreatedItem =
            user.applications.reduce<(typeof user.applications)[number] | null>((oldest, item) => {
              if (!oldest || item.createdDays > oldest.createdDays) return item;
              return oldest;
            }, null) ?? null;
          return {
            ...user,
            pendingCount: user.applications.length,
            oldestAssignedAt: oldestItem?.assignedAt ?? null,
            oldestPendingDays: oldestItem?.pendingDays ?? 0,
            oldestCreatedAt: oldestCreatedItem?.createdAt ?? null,
            oldestCreatedDays: oldestCreatedItem?.createdDays ?? 0,
          };
        })
        .sort((a, b) => {
          if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
          if (b.oldestPendingDays !== a.oldestPendingDays) {
            return b.oldestPendingDays - a.oldestPendingDays;
          }
          return a.userName.localeCompare(b.userName, 'es');
        });

      const totalPendingCount = users.reduce((acc, user) => acc + user.pendingCount, 0);

      return {
        status: 200 as const,
        body: {
          levelId: level.id,
          levelName: level.name,
          levelOrder: level.levelOrder,
          totalPendingCount,
          users,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al consultar carga del nivel de aprobacion ${query.levelId}`,
      });
    }
  },

  subsidyPledgeLookup: async ({ params: { thirdPartyId } }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const thirdParty = await db.query.thirdParties.findFirst({
        where: eq(thirdParties.id, thirdPartyId),
        columns: {
          id: true,
          documentNumber: true,
        },
        with: {
          identificationType: {
            columns: {
              code: true,
            },
          },
        },
      });

      if (!thirdParty) {
        throwHttpError({
          status: 404,
          message: 'Solicitante no encontrado',
          code: 'NOT_FOUND',
        });
      }

      if (!thirdParty.identificationType?.code?.trim()) {
        throwHttpError({
          status: 400,
          message: 'El solicitante no tiene tipo de documento valido para consultar subsidio',
          code: 'BAD_REQUEST',
        });
      }

      const [study, currentPeriod, pledgeCode] = await Promise.all([
        getSubsidyWorkerStudy({
          identificationTypeCode: thirdParty.identificationType.code,
          documentNumber: normalizeDocumentNumber(thirdParty.documentNumber),
        }),
        getSubsidyCurrentPeriod(),
        getPledgeSubsidyCodeSetting(),
      ]);

      if (!study) {
        throwHttpError({
          status: 404,
          message: 'No se encontro informacion de subsidio para el solicitante',
          code: 'NOT_FOUND',
        });
      }

      const subsidyValue = currentPeriod?.period.subsidyValue ?? 0;
      const spouseByDocument = new Map(
        study.spouses
          .filter((item) => item.documentNumber)
          .map((item) => [item.documentNumber as string, item])
      );

      const groupsMap = new Map<
        string,
        {
          groupKey: string;
          groupLabel: string;
          spouseDocumentNumber: string | null;
          spouseName: string | null;
          spouseRelationship: string | null;
          isPermanentPartner: boolean;
          beneficiaries: Array<{
            beneficiaryCode: string;
            documentNumber: string | null;
            fullName: string;
            relationship: string | null;
            relatedSpouseDocumentNumber: string | null;
            birthDate: string | null;
            age: number | null;
            maxSubsidyValue: number;
          }>;
        }
      >();

      study.beneficiaries.forEach((beneficiary, index) => {
        const spouseDocumentNumber = beneficiary.relatedSpouseDocumentNumber ?? null;
        const spouse = spouseDocumentNumber ? spouseByDocument.get(spouseDocumentNumber) : null;
        const groupKey = spouseDocumentNumber ?? 'NO_SPOUSE';
        const group =
          groupsMap.get(groupKey) ??
          (() => {
            const label = spouse
              ? `${spouse.fullName}${spouse.isPermanentPartner ? ' (Companera permanente)' : ''}`
              : 'Relacion sin conyuge';
            const nextGroup = {
              groupKey,
              groupLabel: label,
              spouseDocumentNumber: spouseDocumentNumber,
              spouseName: spouse?.fullName ?? null,
              spouseRelationship: spouse?.relationship ?? null,
              isPermanentPartner: spouse?.isPermanentPartner ?? false,
              beneficiaries: [],
            };
            groupsMap.set(groupKey, nextGroup);
            return nextGroup;
          })();

        group.beneficiaries.push({
          beneficiaryCode: beneficiary.beneficiaryCode
            ? beneficiary.beneficiaryCode
            : buildFallbackBeneficiaryCode({
                documentNumber: beneficiary.documentNumber,
                spouseDocumentNumber,
                fullName: beneficiary.fullName,
                index,
              }),
          documentNumber: beneficiary.documentNumber,
          fullName: beneficiary.fullName,
          relationship: beneficiary.relationship,
          relatedSpouseDocumentNumber: spouseDocumentNumber,
          birthDate: beneficiary.birthDate,
          age: beneficiary.age,
          maxSubsidyValue: subsidyValue,
        });
      });

      const groups = Array.from(groupsMap.values()).sort((left, right) =>
        left.groupLabel.localeCompare(right.groupLabel, 'es')
      );
      groups.forEach((group) => {
        group.beneficiaries.sort((left, right) => left.fullName.localeCompare(right.fullName, 'es'));
      });

      return {
        status: 200 as const,
        body: {
          source: study.source,
          pledgeCode,
          currentPeriod: currentPeriod?.period ?? null,
          groups,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al consultar beneficiarios para pignoracion',
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
      const applicationDate = formatDateOnly(body.applicationDate);
      const paymentCapacity = calculateLoanApplicationPaymentCapacity({
        salary: body.salary,
        otherIncome: body.otherIncome,
        otherCredits: body.otherCredits,
      });
      const coDebtorThirdPartyIds = [
        ...new Set((body.loanApplicationCoDebtors ?? []).map((item) => item.thirdPartyId)),
      ];
      await ensureThirdPartiesAreUpToDate({
        thirdPartyIds: [body.thirdPartyId, ...coDebtorThirdPartyIds],
      });

      if (body.agreementId) {
        await validateLoanApplicationAgreement({
          agreementId: body.agreementId,
          thirdPartyId: body.thirdPartyId,
          referenceDate: applicationDate,
        });
      }

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
      const pledgesEffectiveDate = body.pledgesSubsidy ? body.pledgesEffectiveDate : null;

      if (body.pledgesSubsidy && !pledgesEffectiveDate) {
        throwHttpError({
          status: 400,
          message: 'Debe indicar la fecha para empezar a pignorar',
          code: 'BAD_REQUEST',
        });
      }

      const pledgeCode = pledgesData.length ? await getPledgeSubsidyCodeSetting() : null;

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

      const statusDate = formatDateOnly(new Date());

      const [created] = await db.transaction(async (tx) => {
        const creditNumber = await ensureUniqueCreditNumber(officeCode, tx);

        const [application] = await tx
          .insert(loanApplications)
          .values({
            creditNumber,
            creditFundId: product.creditFundId,
            channelId: body.channelId,
            applicationDate,
            affiliationOfficeId: body.affiliationOfficeId,
            createdByUserId: userId,
            createdByUserName: userName || userId,
            thirdPartyId: body.thirdPartyId,
            agreementId: body.agreementId ?? null,
            categoryCode: body.categoryCode,
            repaymentMethodId: body.repaymentMethodId ?? null,
            paymentGuaranteeTypeId: body.paymentGuaranteeTypeId ?? null,
            pledgesSubsidy: body.pledgesSubsidy,
            salary: toDecimalString(body.salary),
            otherIncome: toDecimalString(body.otherIncome),
            otherCredits: toDecimalString(body.otherCredits),
            paymentCapacity: toDecimalString(paymentCapacity),
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
            investmentTypeId: body.investmentTypeId,
            status: 'PENDING',
            statusChangedByUserId: userId,
            statusDate,
            note: body.note ?? null,
            statusNote: null,
            isInsuranceApproved: false,
          })
          .returning();

        if (coDebtorThirdPartyIds.length) {
          await tx.insert(loanApplicationCoDebtors).values(
            coDebtorThirdPartyIds.map((thirdPartyId) => ({
              loanApplicationId: application.id,
              thirdPartyId,
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
              uploadedByUserName: document.fileKey ? (userName || userId) : null,
            }))
          );
        }

        if (pledgesData.length && pledgeCode && pledgesEffectiveDate) {
          await tx.insert(loanApplicationPledges).values(
            pledgesData.map((pledge) => ({
              loanApplicationId: application.id,
              pledgeCode,
              documentNumber: pledge.documentNumber ?? null,
              beneficiaryCode: pledge.beneficiaryCode,
              pledgedAmount: toDecimalString(pledge.pledgedAmount),
              effectiveDate: formatDateOnly(pledgesEffectiveDate),
            }))
          );
        }

        await tx.insert(loanApplicationStatusHistory).values({
          loanApplicationId: application.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Solicitud creada',
        });

        await assignInitialApproval(tx, {
          loanApplicationId: application.id,
          requestedAmount: application.requestedAmount,
          actor: {
            userId,
            userName: userName || userId,
          },
          action: 'ASSIGNED',
          note: 'Asignacion inicial al crear solicitud',
        });

        const withAssignment = await tx.query.loanApplications.findFirst({
          where: eq(loanApplications.id, application.id),
        });

        if (!withAssignment) {
          throwHttpError({
            status: 500,
            message: 'No fue posible obtener solicitud creada',
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        return [withAssignment];
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

      const hasApprovalProgress = await db.query.loanApplicationApprovalHistory.findFirst({
        where: and(
          eq(loanApplicationApprovalHistory.loanApplicationId, id),
          inArray(loanApplicationApprovalHistory.action, ['APPROVED_FORWARD', 'APPROVED_FINAL'])
        ),
        columns: { id: true },
      });

      if (hasApprovalProgress) {
        throwHttpError({
          status: 400,
          message:
            'No se puede editar la solicitud porque ya tiene una aprobacion registrada en el flujo',
          code: 'BAD_REQUEST',
        });
      }

      const existingPledges = await db.query.loanApplicationPledges.findMany({
        where: eq(loanApplicationPledges.loanApplicationId, id),
        columns: {
          documentNumber: true,
          beneficiaryCode: true,
          pledgedAmount: true,
          effectiveDate: true,
        },
        orderBy: [asc(loanApplicationPledges.id)],
      });

      const targetCreditProductId = body.creditProductId ?? existing.creditProductId;
      const targetCategoryCode = body.categoryCode ?? existing.categoryCode;
      const targetInstallments = body.installments ?? existing.installments;
      const targetApplicationDate = body.applicationDate
        ? formatDateOnly(body.applicationDate)
        : existing.applicationDate;
      const targetRequestedAmount = toNumber(body.requestedAmount ?? existing.requestedAmount);
      const targetAgreementId =
        body.agreementId !== undefined ? body.agreementId : existing.agreementId;
      const targetInsuranceCompanyId =
        body.insuranceCompanyId !== undefined
          ? body.insuranceCompanyId
          : existing.insuranceCompanyId;
      const targetSalary = body.salary ?? existing.salary;
      const targetOtherIncome = body.otherIncome ?? existing.otherIncome;
      const targetOtherCredits = body.otherCredits ?? existing.otherCredits;
      const paymentCapacity = calculateLoanApplicationPaymentCapacity({
        salary: targetSalary,
        otherIncome: targetOtherIncome,
        otherCredits: targetOtherCredits,
      });
      const requestedCoDebtorIds =
        body.loanApplicationCoDebtors !== undefined
          ? [...new Set(body.loanApplicationCoDebtors.map((item) => item.thirdPartyId))]
          : undefined;
      const targetCoDebtorIds = (
        requestedCoDebtorIds ??
        (
          await db.query.loanApplicationCoDebtors.findMany({
            where: eq(loanApplicationCoDebtors.loanApplicationId, id),
            columns: { thirdPartyId: true },
          })
        ).map((item) => item.thirdPartyId)
      ).filter((thirdPartyId): thirdPartyId is number => thirdPartyId !== null);
      const targetThirdPartyId = body.thirdPartyId ?? existing.thirdPartyId;
      if (!targetThirdPartyId) {
        throwHttpError({
          status: 400,
          message: 'Debe seleccionar un solicitante valido',
          code: 'BAD_REQUEST',
        });
      }

      await ensureThirdPartiesAreUpToDate({
        thirdPartyIds: [targetThirdPartyId, ...targetCoDebtorIds],
      });

      if (targetAgreementId) {
        await validateLoanApplicationAgreement({
          agreementId: targetAgreementId,
          thirdPartyId: targetThirdPartyId,
          referenceDate: targetApplicationDate,
        });
      }

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

      const { userId, userName } = getRequiredUserContext(session);

      const [updated] = await db.transaction(async (tx) => {
        const [updatedApplication] = await tx
          .update(loanApplications)
          .set({
            creditFundId: product.creditFundId,
            channelId: body.channelId ?? existing.channelId,
            applicationDate: targetApplicationDate,
            affiliationOfficeId: body.affiliationOfficeId ?? existing.affiliationOfficeId,
            thirdPartyId: body.thirdPartyId ?? existing.thirdPartyId,
            agreementId: targetAgreementId ?? null,
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
            salary: toDecimalString(targetSalary),
            otherIncome: toDecimalString(targetOtherIncome),
            otherCredits: toDecimalString(targetOtherCredits),
            paymentCapacity: toDecimalString(paymentCapacity),
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
          })
          .where(eq(loanApplications.id, id))
          .returning();

        if (body.loanApplicationCoDebtors !== undefined) {
          await tx
            .delete(loanApplicationCoDebtors)
            .where(eq(loanApplicationCoDebtors.loanApplicationId, id));

          if (requestedCoDebtorIds?.length) {
            await tx.insert(loanApplicationCoDebtors).values(
              requestedCoDebtorIds.map((thirdPartyId) => ({
                loanApplicationId: id,
                thirdPartyId,
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
                uploadedByUserName: document.fileKey ? (userName || userId) : null,
              }))
            );
          }
        }

        const shouldUpdatePledges =
          body.loanApplicationPledges !== undefined ||
          body.pledgesSubsidy !== undefined ||
          body.pledgesEffectiveDate !== undefined;
        if (shouldUpdatePledges) {
          await tx
            .delete(loanApplicationPledges)
            .where(eq(loanApplicationPledges.loanApplicationId, id));

          const pledgesSubsidy = body.pledgesSubsidy ?? existing.pledgesSubsidy;
          const pledgesData = pledgesSubsidy
            ? (body.loanApplicationPledges ??
              existingPledges.map((pledge) => ({
                documentNumber: pledge.documentNumber ?? null,
                beneficiaryCode: pledge.beneficiaryCode,
                pledgedAmount: String(pledge.pledgedAmount),
              })))
            : [];
          const pledgesEffectiveDate = pledgesSubsidy
            ? body.pledgesEffectiveDate
              ? formatDateOnly(body.pledgesEffectiveDate)
              : existingPledges[0]?.effectiveDate
                ? existingPledges[0].effectiveDate
                : null
            : null;

          if (pledgesSubsidy && pledgesData.length === 0) {
            throwHttpError({
              status: 400,
              message: 'Debe registrar al menos una pignoracion cuando aplica subsidio',
              code: 'BAD_REQUEST',
            });
          }

          if (pledgesSubsidy && !pledgesEffectiveDate) {
            throwHttpError({
              status: 400,
              message: 'Debe indicar la fecha para empezar a pignorar',
              code: 'BAD_REQUEST',
            });
          }

          const pledgeCode = pledgesData.length ? await getPledgeSubsidyCodeSetting() : null;

          if (pledgesData.length && pledgeCode && pledgesEffectiveDate) {
            await tx.insert(loanApplicationPledges).values(
              pledgesData.map((pledge) => ({
                loanApplicationId: id,
                pledgeCode,
                documentNumber: pledge.documentNumber ?? null,
                beneficiaryCode: pledge.beneficiaryCode,
                pledgedAmount: toDecimalString(pledge.pledgedAmount),
                effectiveDate: pledgesEffectiveDate,
              }))
            );
          }
        }

        await assignInitialApproval(tx, {
          loanApplicationId: updatedApplication.id,
          requestedAmount: updatedApplication.requestedAmount,
          actor: {
            userId,
            userName: userName || userId,
          },
          action: 'REASSIGNED',
          note: 'Reinicio de flujo por edicion de solicitud',
        });

        const refreshed = await tx.query.loanApplications.findFirst({
          where: eq(loanApplications.id, id),
        });

        if (!refreshed) {
          throwHttpError({
            status: 500,
            message: 'No fue posible obtener solicitud actualizada',
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        return [refreshed];
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

      const { userId, userName } = getRequiredUserContext(session);
      const statusDate = formatDateOnly(new Date());

      const [updated] = await db.transaction(async (tx) => {
        // Re-read inside tx for consistent fromStatus
        const current = await tx.query.loanApplications.findFirst({
          where: eq(loanApplications.id, id),
          columns: {
            id: true,
            status: true,
            requestedAmount: true,
            currentApprovalLevelId: true,
            targetApprovalLevelId: true,
            assignedApprovalUserId: true,
            assignedApprovalUserName: true,
            approvalAssignedAt: true,
          },
        });

        if (!current || current.status !== 'PENDING') {
          throwHttpError({
            status: 400,
            message: 'Solo se pueden cancelar solicitudes en estado pendiente',
            code: 'BAD_REQUEST',
          });
        }

        const pendingApplication = await ensurePendingAssignment(tx, current, {
          userId,
          userName: userName || userId,
        });

        assertAssignedApprover(pendingApplication, userId);

        const [application] = await tx
          .update(loanApplications)
          .set({
            status: 'CANCELED',
            statusDate,
            statusChangedByUserId: userId,
            statusNote: body.statusNote,
            rejectionReasonId: null,
            assignedApprovalUserId: null,
            assignedApprovalUserName: null,
            currentApprovalLevelId: null,
            targetApprovalLevelId: null,
            approvalAssignedAt: null,
          })
          .where(eq(loanApplications.id, id))
          .returning();

        await tx.insert(loanApplicationStatusHistory).values({
          loanApplicationId: id,
          fromStatus: current.status,
          toStatus: 'CANCELED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: body.statusNote.slice(0, 255),
        });

        await recordRejectedOrCanceled(tx, {
          loanApplicationId: id,
          levelId: pendingApplication.currentApprovalLevelId ?? null,
          action: 'CANCELED',
          actor: {
            userId,
            userName: userName || userId,
          },
          note: body.statusNote,
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

      const { userId, userName } = getRequiredUserContext(session);
      const statusDate = formatDateOnly(new Date());

      const [updated] = await db.transaction(async (tx) => {
        // Re-read inside tx for consistent fromStatus
        const current = await tx.query.loanApplications.findFirst({
          where: eq(loanApplications.id, id),
          columns: {
            id: true,
            status: true,
            requestedAmount: true,
            currentApprovalLevelId: true,
            targetApprovalLevelId: true,
            assignedApprovalUserId: true,
            assignedApprovalUserName: true,
            approvalAssignedAt: true,
          },
        });

        if (!current || current.status !== 'PENDING') {
          throwHttpError({
            status: 400,
            message: 'Solo se pueden rechazar solicitudes en estado pendiente',
            code: 'BAD_REQUEST',
          });
        }

        const pendingApplication = await ensurePendingAssignment(tx, current, {
          userId,
          userName: userName || userId,
        });

        assertAssignedApprover(pendingApplication, userId);

        const [application] = await tx
          .update(loanApplications)
          .set({
            status: 'REJECTED',
            statusDate,
            statusChangedByUserId: userId,
            statusNote: body.statusNote,
            rejectionReasonId: body.rejectionReasonId,
            assignedApprovalUserId: null,
            assignedApprovalUserName: null,
            currentApprovalLevelId: null,
            targetApprovalLevelId: null,
            approvalAssignedAt: null,
          })
          .where(eq(loanApplications.id, id))
          .returning();

        await tx.insert(loanApplicationStatusHistory).values({
          loanApplicationId: id,
          fromStatus: current.status,
          toStatus: 'REJECTED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: body.statusNote.slice(0, 255),
          metadata: {
            rejectionReasonId: body.rejectionReasonId,
          },
        });

        await recordRejectedOrCanceled(tx, {
          loanApplicationId: id,
          levelId: pendingApplication.currentApprovalLevelId ?? null,
          action: 'REJECTED',
          actor: {
            userId,
            userName: userName || userId,
          },
          note: body.statusNote,
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

      const { userId, userName } = getRequiredUserContext(session);
      const today = formatDateOnly(new Date());

      if (body.mode === 'STEP') {
        const approvedAmount = toNumber(body.approvedAmount);
        if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
          throwHttpError({
            status: 400,
            message: 'Valor aprobado invalido',
            code: 'BAD_REQUEST',
          });
        }

        const [repaymentMethod, paymentGuaranteeType, actNumber, product] = await Promise.all([
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
          db.query.loanApplicationActNumbers.findFirst({
            where: and(
              eq(loanApplicationActNumbers.affiliationOfficeId, existing.affiliationOfficeId),
              eq(loanApplicationActNumbers.actDate, today),
              eq(loanApplicationActNumbers.actNumber, body.actNumber)
            ),
          }),
          db.query.creditProducts.findFirst({
            where: eq(creditProducts.id, existing.creditProductId),
            columns: {
              id: true,
              name: true,
              maxInstallments: true,
              paysInsurance: true,
            },
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

        if (!actNumber) {
          throwHttpError({
            status: 404,
            message: 'Acta no encontrada para la oficina de la solicitud',
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

        if (product.maxInstallments && body.approvedInstallments > product.maxInstallments) {
          throwHttpError({
            status: 400,
            message: `El numero de cuotas supera el maximo permitido (${product.maxInstallments})`,
            code: 'BAD_REQUEST',
          });
        }

        const stepIsInsuranceApproved =
          product.paysInsurance && Boolean(body.isInsuranceApproved);

        const [updated] = await db.transaction(async (tx) => {
          const current = await tx.query.loanApplications.findFirst({
            where: eq(loanApplications.id, id),
            columns: {
              id: true,
              status: true,
              requestedAmount: true,
              currentApprovalLevelId: true,
              targetApprovalLevelId: true,
              assignedApprovalUserId: true,
              assignedApprovalUserName: true,
              approvalAssignedAt: true,
            },
          });

          if (!current) {
            throwHttpError({
              status: 404,
              message: `Solicitud de credito con ID ${id} no encontrada`,
              code: 'NOT_FOUND',
            });
          }

          if (current.status !== 'PENDING') {
            throwHttpError({
              status: 400,
              message: 'Solo se pueden aprobar solicitudes en estado pendiente',
              code: 'BAD_REQUEST',
            });
          }

          const pendingApplication = await ensurePendingAssignment(tx, current, {
            userId,
            userName: userName || userId,
          });

          assertAssignedApprover(pendingApplication, userId);

          if (
            !pendingApplication.currentApprovalLevelId ||
            !pendingApplication.targetApprovalLevelId
          ) {
            throwHttpError({
              status: 409,
              message: 'No fue posible determinar el nivel de aprobacion de la solicitud',
              code: 'CONFLICT',
            });
          }

          if (
            pendingApplication.currentApprovalLevelId === pendingApplication.targetApprovalLevelId
          ) {
            throwHttpError({
              status: 400,
              message: 'Esta solicitud requiere aprobacion final con los datos de desembolso',
              code: 'BAD_REQUEST',
            });
          }

          // Validate approvedAmount does not exceed the level's maxApprovalAmount
          const currentLevel = await tx.query.loanApprovalLevels.findFirst({
            where: eq(loanApprovalLevels.id, pendingApplication.currentApprovalLevelId),
            columns: { maxApprovalAmount: true, name: true },
          });

          if (
            currentLevel?.maxApprovalAmount !== null &&
            currentLevel?.maxApprovalAmount !== undefined
          ) {
            const levelMax = toNumber(currentLevel.maxApprovalAmount);
            if (approvedAmount > levelMax) {
              throwHttpError({
                status: 400,
                message: `El monto aprobado ($${approvedAmount.toLocaleString()}) excede el tope del nivel "${currentLevel.name}" ($${levelMax.toLocaleString()}). Se requiere un nivel superior.`,
                code: 'BAD_REQUEST',
              });
            }
          }

          await tx
            .update(loanApplications)
            .set({
              repaymentMethodId: body.repaymentMethodId,
              paymentGuaranteeTypeId: body.paymentGuaranteeTypeId,
              isInsuranceApproved: stepIsInsuranceApproved,
              approvedInstallments: body.approvedInstallments,
              approvedAmount: toDecimalString(body.approvedAmount),
              actNumber: body.actNumber,
            })
            .where(eq(loanApplications.id, id));

          await approveIntermediateLevel(tx, {
            loanApplicationId: id,
            currentLevelId: pendingApplication.currentApprovalLevelId,
            targetLevelId: pendingApplication.targetApprovalLevelId,
            actor: {
              userId,
              userName: userName || userId,
            },
            note: body.approvalNote,
            metadata: {
              repaymentMethodId: body.repaymentMethodId,
              repaymentMethodName: repaymentMethod.name,
              paymentGuaranteeTypeId: body.paymentGuaranteeTypeId,
              paymentGuaranteeTypeName: paymentGuaranteeType.name,
              isInsuranceApproved: stepIsInsuranceApproved,
              approvedInstallments: body.approvedInstallments,
              approvedAmount: toDecimalString(body.approvedAmount),
              actNumber: body.actNumber,
            },
          });

          const refreshed = await tx.query.loanApplications.findFirst({
            where: eq(loanApplications.id, id),
          });

          if (!refreshed) {
            throwHttpError({
              status: 500,
              message: 'No fue posible obtener solicitud aprobada por nivel',
              code: 'INTERNAL_SERVER_ERROR',
            });
          }

          return [refreshed];
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
            mode: body.mode,
            body,
          },
          ipAddress,
          userAgent,
        });

        return { status: 200 as const, body: updated };
      }

      const finalBody = body;

      if (!existing.paymentFrequencyId) {
        throwHttpError({
          status: 400,
          message: 'La solicitud no tiene periodicidad de pago configurada',
          code: 'BAD_REQUEST',
        });
      }

      const approvedAmount = toNumber(finalBody.approvedAmount);
      if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
        throwHttpError({
          status: 400,
          message: 'Valor aprobado invalido',
          code: 'BAD_REQUEST',
        });
      }
      const approvedInstallments = finalBody.approvedInstallments;

      const [
        affiliationOffice,
        repaymentMethod,
        paymentGuaranteeType,
        payeeThirdParty,
        product,
        paymentFrequency,
        actNumber,
        settings,
      ] = await Promise.all([
        db.query.affiliationOffices.findFirst({
          where: eq(affiliationOffices.id, existing.affiliationOfficeId),
        }),
        db.query.repaymentMethods.findFirst({
          where: and(
            eq(repaymentMethods.id, finalBody.repaymentMethodId),
            eq(repaymentMethods.isActive, true)
          ),
        }),
        db.query.paymentGuaranteeTypes.findFirst({
          where: and(
            eq(paymentGuaranteeTypes.id, finalBody.paymentGuaranteeTypeId),
            eq(paymentGuaranteeTypes.isActive, true)
          ),
        }),
        db.query.thirdParties.findFirst({
          where: eq(thirdParties.id, finalBody.payeeThirdPartyId),
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
            eq(loanApplicationActNumbers.actDate, today),
            eq(loanApplicationActNumbers.actNumber, finalBody.actNumber)
          ),
        }),
        db.query.creditsSettings.findFirst({
          where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
        }),
      ]);

      if (!affiliationOffice) {
        throwHttpError({
          status: 404,
          message: 'Oficina de afiliacion no encontrada',
          code: 'NOT_FOUND',
        });
      }

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
      if (product.maxInstallments && approvedInstallments > product.maxInstallments) {
        throwHttpError({
          status: 400,
          message: `El numero de cuotas supera el maximo permitido (${product.maxInstallments})`,
          code: 'BAD_REQUEST',
        });
      }

      if (!paymentFrequency) {
        throwHttpError({
          status: 404,
          message: 'Periodicidad de pago no valida',
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

      if (!actNumber) {
        throwHttpError({
          status: 404,
          message: 'Acta no encontrada para la oficina de la solicitud',
          code: 'NOT_FOUND',
        });
      }

      const minimumDaysBeforeFirstCollection = settings?.minDaysBeforeFirstCollection ?? 7;
      const minimumAllowedFirstCollectionDate = resolveSuggestedFirstCollectionDate({
        baseDate: new Date(`${today}T00:00:00`),
        minimumDaysBeforeCollection: minimumDaysBeforeFirstCollection,
        scheduleMode: paymentFrequency.scheduleMode,
        intervalDays: paymentFrequency.intervalDays,
        dayOfMonth: paymentFrequency.dayOfMonth,
        semiMonthDay1: paymentFrequency.semiMonthDay1,
        semiMonthDay2: paymentFrequency.semiMonthDay2,
        useEndOfMonthFallback: paymentFrequency.useEndOfMonthFallback,
      });
      const selectedFirstCollectionDate = new Date(finalBody.firstCollectionDate);
      selectedFirstCollectionDate.setHours(0, 0, 0, 0);

      if (selectedFirstCollectionDate < minimumAllowedFirstCollectionDate) {
        throwHttpError({
          status: 400,
          message: `La fecha de primer recaudo debe ser igual o posterior a ${formatDateOnly(minimumAllowedFirstCollectionDate)}`,
          code: 'BAD_REQUEST',
        });
      }

      const statusDate = today;
      const firstCollectionDate = formatDateOnly(finalBody.firstCollectionDate);
      const approvedDate = statusDate;
      const agreement =
        existing.agreementId != null
          ? await validateLoanApplicationAgreement({
              agreementId: existing.agreementId,
              thirdPartyId: existing.thirdPartyId,
              referenceDate: approvedDate,
            })
          : null;

      // -----------------------------------------------------------------------
      // Billing concept resolution (BEFORE simulation so FINANCED_IN_LOAN can
      // adjust the principal and amortization includes interest on those amounts)
      // -----------------------------------------------------------------------
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

        if (!selectedRule && !concept.isSystem) {
          throwHttpError({
            status: 400,
            message: `El concepto ${concept.name} no tiene regla activa para la fecha de aprobacion`,
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

      // -----------------------------------------------------------------------
      // FINANCED_IN_LOAN: compute amounts and build effectivePrincipal.
      // These amounts are added to the principal so the amortization schedule
      // charges interest on them automatically.
      // -----------------------------------------------------------------------
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
            principal: approvedAmount,
            firstInstallmentAmount: 0, // blocked by validation for FINANCED_IN_LOAN
          });
          snapshot.computedAmount = toDecimalString(conceptAmount);
          totalFinancedAmount = roundMoney(totalFinancedAmount + conceptAmount);
        }
      }

      const effectivePrincipal = roundMoney(approvedAmount + totalFinancedAmount);

      // -----------------------------------------------------------------------
      // Insurance + Simulation (principal includes financed concept amounts)
      // -----------------------------------------------------------------------
      const isInsuranceApproved = product.paysInsurance && Boolean(finalBody.isInsuranceApproved);
      const insuranceCalculation = isInsuranceApproved
        ? await resolveInsuranceFactor({
            creditProductId: existing.creditProductId,
            insuranceCompanyId: existing.insuranceCompanyId,
            installments: approvedInstallments,
            requestedAmount: approvedAmount,
            product,
          })
        : {
            product,
            insuranceFactor: 0,
            insuranceCompanyId: null,
            insuranceRateType: null,
            insuranceRatePercent: 0,
            insuranceFixedAmount: 0,
            insuranceMinimumAmount: 0,
          };

      const schedule = calculateCreditSimulation({
        financingType: product.financingType,
        principal: effectivePrincipal,
        annualRatePercent: toNumber(existing.financingFactor),
        interestRateType: product.interestRateType,
        interestDayCountConvention: product.interestDayCountConvention,
        installments: approvedInstallments,
        firstPaymentDate: finalBody.firstCollectionDate,
        disbursementDate: new Date(`${today}T00:00:00`),
        daysInterval: paymentFrequencyIntervalDays,
        paymentScheduleMode: paymentFrequency.scheduleMode,
        dayOfMonth: paymentFrequency.dayOfMonth,
        semiMonthDay1: paymentFrequency.semiMonthDay1,
        semiMonthDay2: paymentFrequency.semiMonthDay2,
        useEndOfMonthFallback: paymentFrequency.useEndOfMonthFallback,
        insuranceAccrualMethod: product.insuranceAccrualMethod,
        insuranceRatePercent: insuranceCalculation.insuranceRatePercent,
        insuranceFixedAmount: insuranceCalculation.insuranceFixedAmount,
        insuranceMinimumAmount: insuranceCalculation.insuranceMinimumAmount,
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

      // -----------------------------------------------------------------------
      // Populate computedAmount for remaining ONE_TIME concepts (DISCOUNT,
      // BILLED_SEPARATELY) — now that we have the schedule with installments.
      // -----------------------------------------------------------------------
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

      const [updated] = await db.transaction(async (tx) => {
        const stateForApproval = await tx.query.loanApplications.findFirst({
          where: eq(loanApplications.id, id),
          columns: {
            id: true,
            status: true,
            requestedAmount: true,
            currentApprovalLevelId: true,
            targetApprovalLevelId: true,
            assignedApprovalUserId: true,
            assignedApprovalUserName: true,
            approvalAssignedAt: true,
          },
        });

        if (!stateForApproval) {
          throwHttpError({
            status: 404,
            message: `Solicitud de credito con ID ${id} no encontrada`,
            code: 'NOT_FOUND',
          });
        }

        if (stateForApproval.status !== 'PENDING') {
          throwHttpError({
            status: 400,
            message: 'Solo se pueden aprobar solicitudes en estado pendiente',
            code: 'BAD_REQUEST',
          });
        }

        const pendingApplication = await ensurePendingAssignment(tx, stateForApproval, {
          userId,
          userName: userName || userId,
        });

        assertAssignedApprover(pendingApplication, userId);

        if (
          !pendingApplication.currentApprovalLevelId ||
          !pendingApplication.targetApprovalLevelId
        ) {
          throwHttpError({
            status: 409,
            message: 'No fue posible determinar el nivel de aprobacion de la solicitud',
            code: 'CONFLICT',
          });
        }

        if (
          pendingApplication.currentApprovalLevelId !== pendingApplication.targetApprovalLevelId
        ) {
          throwHttpError({
            status: 400,
            message: 'La solicitud aun no esta en el nivel final de aprobacion',
            code: 'BAD_REQUEST',
          });
        }

        // Validate approvedAmount does not exceed the level's maxApprovalAmount
        const currentLevel = await tx.query.loanApprovalLevels.findFirst({
          where: eq(loanApprovalLevels.id, pendingApplication.currentApprovalLevelId),
          columns: { maxApprovalAmount: true, name: true },
        });

        if (
          currentLevel?.maxApprovalAmount !== null &&
          currentLevel?.maxApprovalAmount !== undefined
        ) {
          const levelMax = toNumber(currentLevel.maxApprovalAmount);
          if (approvedAmount > levelMax) {
            throwHttpError({
              status: 400,
              message: `El monto aprobado ($${approvedAmount.toLocaleString()}) excede el tope del nivel "${currentLevel.name}" ($${levelMax.toLocaleString()}). Se requiere un nivel superior.`,
              code: 'BAD_REQUEST',
            });
          }
        }

        const [application] = await tx
          .update(loanApplications)
          .set({
            repaymentMethodId: finalBody.repaymentMethodId,
            paymentGuaranteeTypeId: finalBody.paymentGuaranteeTypeId,
            isInsuranceApproved,
            approvedInstallments,
            approvedAmount: toDecimalString(approvedAmount),
            actNumber: finalBody.actNumber,
            status: 'APPROVED',
            statusDate,
            statusChangedByUserId: userId,
            rejectionReasonId: null,
            statusNote: null,
            assignedApprovalUserId: null,
            assignedApprovalUserName: null,
            currentApprovalLevelId: null,
            targetApprovalLevelId: null,
            approvalAssignedAt: null,
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
            agreementId: existing.agreementId ?? null,
            bankId: existing.bankId,
            bankAccountType: existing.bankAccountType,
            bankAccountNumber: existing.bankAccountNumber,
            thirdPartyId: existing.thirdPartyId,
            payeeThirdPartyId: finalBody.payeeThirdPartyId,
            installments: approvedInstallments,
            creditStartDate: statusDate,
            maturityDate: lastInstallment.dueDate,
            firstCollectionDate,
            principalAmount: toDecimalString(effectivePrincipal),
            initialTotalAmount: toDecimalString(schedule.summary.totalPayment),
            insuranceCompanyId: isInsuranceApproved ? existing.insuranceCompanyId : null,
            insuranceValue: toDecimalString(schedule.summary.totalInsurance),
            costCenterId: affiliationOffice.costCenterId ?? null,
            repaymentMethodId: finalBody.repaymentMethodId,
            paymentGuaranteeTypeId: finalBody.paymentGuaranteeTypeId,
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

        if (agreement) {
          await tx.insert(loanAgreementHistory).values({
            loanId: loan.id,
            agreementId: agreement.id,
            effectiveDate: statusDate,
            changedByUserId: userId,
            changedByUserName: userName || userId,
            note: 'Convenio tomado desde la solicitud',
            metadata: {
              sourceLoanApplicationId: id,
              actNumber: finalBody.actNumber,
            },
          });
        }

        await tx.insert(loanStatusHistory).values({
          loanId: loan.id,
          fromStatus: null,
          toStatus: 'GENERATED',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Credito generado desde aprobacion de solicitud',
          metadata: {
            sourceLoanApplicationId: id,
            actNumber: finalBody.actNumber,
            approvedInstallments,
          },
        });

        await recordLoanDisbursementEvent(tx, {
          loanId: loan.id,
          eventType: 'CREATED',
          eventDate: statusDate,
          newFirstCollectionDate: firstCollectionDate,
          newMaturityDate: lastInstallment.dueDate,
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Crédito generado desde aprobación de solicitud',
          metadata: {
            sourceLoanApplicationId: id,
            actNumber: finalBody.actNumber,
            approvedInstallments,
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
          note: `Solicitud aprobada. Acta ${finalBody.actNumber}`.slice(0, 255),
          metadata: {
            loanId: loan.id,
            approvedAmount: toDecimalString(approvedAmount),
            actNumber: finalBody.actNumber,
            agreementId: existing.agreementId ?? null,
            payeeThirdPartyId: finalBody.payeeThirdPartyId,
            approvedInstallments,
            firstCollectionDate,
          },
        });

        await recordFinalApproval(tx, {
          loanApplicationId: id,
          levelId: pendingApplication.currentApprovalLevelId,
          actor: {
            userId,
            userName: userName || userId,
          },
          note: `Aprobacion final. Acta ${finalBody.actNumber}`,
          metadata: {
            loanId: loan.id,
            repaymentMethodName: repaymentMethod.name,
            paymentGuaranteeTypeName: paymentGuaranteeType.name,
            isInsuranceApproved,
            approvedAmount: toDecimalString(approvedAmount),
            approvedInstallments,
            actNumber: finalBody.actNumber,
            agreementId: existing.agreementId ?? null,
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
          mode: finalBody.mode,
          body: finalBody,
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

  reassign: async ({ body }, { request, appRoute, nextRequest }) => {
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

      if (body.strategy === 'TO_USER' && !body.toAssignedUserId) {
        throwHttpError({
          status: 400,
          message: 'Debe seleccionar usuario destino',
          code: 'BAD_REQUEST',
        });
      }

      if (body.strategy === 'TO_USER' && body.toAssignedUserId === body.fromAssignedUserId) {
        throwHttpError({
          status: 400,
          message: 'El usuario destino debe ser diferente al usuario origen',
          code: 'BAD_REQUEST',
        });
      }

      const { userId, userName } = getRequiredUserContext(session);
      const note = body.note?.trim();

      const [result] = await db.transaction(async (tx) => {
        const assignedApplications = await tx.query.loanApplications.findMany({
          where: and(
            eq(loanApplications.status, 'PENDING'),
            eq(loanApplications.assignedApprovalUserId, body.fromAssignedUserId)
          ),
          columns: {
            id: true,
            status: true,
            requestedAmount: true,
            currentApprovalLevelId: true,
            targetApprovalLevelId: true,
            assignedApprovalUserId: true,
            assignedApprovalUserName: true,
            approvalAssignedAt: true,
          },
          orderBy: [asc(loanApplications.createdAt), asc(loanApplications.id)],
        });

        const ensuredApplications: Array<{
          id: number;
          currentApprovalLevelId: number;
        }> = [];
        for (const application of assignedApplications) {
          const ensured = await ensurePendingAssignment(tx, application, {
            userId,
            userName: userName || userId,
          });

          if (ensured.assignedApprovalUserId !== body.fromAssignedUserId) {
            continue;
          }

          if (!ensured.currentApprovalLevelId) {
            throwHttpError({
              status: 409,
              message: `La solicitud ${ensured.id} no tiene nivel actual para reasignar`,
              code: 'CONFLICT',
            });
          }

          ensuredApplications.push({
            id: ensured.id,
            currentApprovalLevelId: ensured.currentApprovalLevelId,
          });
        }

        if (body.strategy === 'TO_USER' && ensuredApplications.length) {
          const sourceLevelIds = Array.from(
            new Set(ensuredApplications.map((application) => application.currentApprovalLevelId))
          );

          if (sourceLevelIds.length !== 1 || !sourceLevelIds[0]) {
            throwHttpError({
              status: 409,
              message:
                'El usuario origen tiene solicitudes pendientes en varios niveles. Use round robin o reasigne por nivel.',
              code: 'CONFLICT',
            });
          }

          const targetLevelMemberships = await tx.query.loanApprovalLevelUsers.findMany({
            where: and(
              eq(loanApprovalLevelUsers.userId, body.toAssignedUserId!),
              eq(loanApprovalLevelUsers.isActive, true)
            ),
            columns: {
              loanApprovalLevelId: true,
            },
          });

          const targetLevelIds = Array.from(
            new Set(targetLevelMemberships.map((item) => item.loanApprovalLevelId))
          );

          if (targetLevelIds.length !== 1) {
            throwHttpError({
              status: 409,
              message:
                'El usuario destino debe estar configurado en un unico nivel activo para la reasignacion masiva.',
              code: 'CONFLICT',
            });
          }

          if (targetLevelIds[0] !== sourceLevelIds[0]) {
            throwHttpError({
              status: 409,
              message:
                'El usuario destino debe pertenecer al mismo nivel activo del usuario origen.',
              code: 'CONFLICT',
            });
          }
        }

        let reassignedCount = 0;
        for (const ensured of ensuredApplications) {
          await reassignApplicationApproval(tx, {
            loanApplicationId: ensured.id,
            currentLevelId: ensured.currentApprovalLevelId,
            fromAssignedUserId: body.fromAssignedUserId,
            actor: {
              userId,
              userName: userName || userId,
            },
            strategy: body.strategy,
            toAssignedUserId: body.toAssignedUserId,
            note:
              note ||
              (body.strategy === 'ROUND_ROBIN'
                ? 'Reasignacion masiva por round robin'
                : 'Reasignacion masiva a usuario'),
          });
          reassignedCount += 1;
        }

        return [
          {
            totalMatched: assignedApplications.length,
            reassignedCount,
          },
        ];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'reassign',
        status: 'success',
        metadata: {
          body,
          result,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: result };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al reasignar solicitudes',
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'reassign',
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

  reassignOne: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
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

      if (body.strategy === 'TO_USER' && !body.toAssignedUserId) {
        throwHttpError({
          status: 400,
          message: 'Debe seleccionar usuario destino',
          code: 'BAD_REQUEST',
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
          message: 'Solo se pueden reasignar solicitudes en estado pendiente',
          code: 'BAD_REQUEST',
        });
      }

      const { userId, userName } = getRequiredUserContext(session);
      const note = body.note?.trim();

      const [updated] = await db.transaction(async (tx) => {
        const pendingApplication = await ensurePendingAssignment(
          tx,
          {
            id: existing.id,
            status: existing.status,
            requestedAmount: existing.requestedAmount,
            currentApprovalLevelId: existing.currentApprovalLevelId,
            targetApprovalLevelId: existing.targetApprovalLevelId,
            assignedApprovalUserId: existing.assignedApprovalUserId,
            assignedApprovalUserName: existing.assignedApprovalUserName,
            approvalAssignedAt: existing.approvalAssignedAt,
          },
          {
            userId,
            userName: userName || userId,
          }
        );

        if (
          !pendingApplication.currentApprovalLevelId ||
          !pendingApplication.assignedApprovalUserId
        ) {
          throwHttpError({
            status: 409,
            message: 'La solicitud no tiene asignacion vigente para reasignar',
            code: 'CONFLICT',
          });
        }

        if (
          body.strategy === 'TO_USER' &&
          body.toAssignedUserId === pendingApplication.assignedApprovalUserId
        ) {
          throwHttpError({
            status: 400,
            message: 'El usuario destino debe ser diferente al asignado actual',
            code: 'BAD_REQUEST',
          });
        }

        await reassignApplicationApproval(tx, {
          loanApplicationId: id,
          currentLevelId: pendingApplication.currentApprovalLevelId,
          fromAssignedUserId: pendingApplication.assignedApprovalUserId,
          actor: {
            userId,
            userName: userName || userId,
          },
          strategy: body.strategy,
          toAssignedUserId: body.toAssignedUserId,
          note:
            note ||
            (body.strategy === 'ROUND_ROBIN'
              ? 'Reasignacion individual por round robin'
              : 'Reasignacion individual a usuario'),
        });

        const refreshed = await tx.query.loanApplications.findFirst({
          where: eq(loanApplications.id, id),
        });

        if (!refreshed) {
          throwHttpError({
            status: 500,
            message: 'No fue posible obtener solicitud reasignada',
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        return [refreshed];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'reassignOne',
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
        genericMsg: `Error al reasignar solicitud de credito ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'reassignOne',
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
