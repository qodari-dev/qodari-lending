import {
  db,
  loanAgreementHistory,
  loanInstallments,
  loanPayments,
  loans,
  loanStatusHistory,
} from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { tsr } from '@ts-rest/serverless/next';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type LoanColumn = keyof typeof loans.$inferSelect;

const LOAN_FIELDS: FieldMap = {
  id: loans.id,
  creditNumber: loans.creditNumber,
  loanApplicationId: loans.loanApplicationId,
  agreementId: loans.agreementId,
  thirdPartyId: loans.thirdPartyId,
  payeeThirdPartyId: loans.payeeThirdPartyId,
  status: loans.status,
  disbursementStatus: loans.disbursementStatus,
  recordDate: loans.recordDate,
  creditStartDate: loans.creditStartDate,
  maturityDate: loans.maturityDate,
  principalAmount: loans.principalAmount,
  createdAt: loans.createdAt,
  updatedAt: loans.updatedAt,
} satisfies Partial<Record<LoanColumn, (typeof loans)[LoanColumn]>>;

const LOAN_QUERY_CONFIG: QueryConfig = {
  fields: LOAN_FIELDS,
  searchFields: [loans.creditNumber, loans.voucherNumber],
  defaultSort: { column: loans.createdAt, order: 'desc' },
};

const LOAN_INCLUDES = createIncludeMap<typeof db.query.loans>()({
  loanApplication: {
    relation: 'loanApplication',
    config: {
      with: {
        affiliationOffice: true,
        creditFund: true,
        thirdParty: true,
        repaymentMethod: true,
        bank: true,
        creditProduct: true,
        paymentFrequency: true,
        insuranceCompany: true,
        rejectionReason: true,
        investmentType: true,
        channel: true,
        paymentGuaranteeType: true,
        loanApplicationCoDebtors: {
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
        loanApplicationDocuments: {
          with: {
            documentType: true,
          },
        },
        loanApplicationPledges: true,
      },
    },
  },
  agreement: {
    relation: 'agreement',
    config: true,
  },
  creditFund: {
    relation: 'creditFund',
    config: true,
  },
  repaymentMethod: {
    relation: 'repaymentMethod',
    config: true,
  },
  paymentFrequency: {
    relation: 'paymentFrequency',
    config: true,
  },
  paymentGuaranteeType: {
    relation: 'paymentGuaranteeType',
    config: true,
  },
  affiliationOffice: {
    relation: 'affiliationOffice',
    config: true,
  },
  insuranceCompany: {
    relation: 'insuranceCompany',
    config: true,
  },
  costCenter: {
    relation: 'costCenter',
    config: true,
  },
  borrower: {
    relation: 'borrower',
    config: true,
  },
  disbursementParty: {
    relation: 'disbursementParty',
    config: true,
  },
  channel: {
    relation: 'channel',
    config: true,
  },
  loanInstallments: {
    relation: 'loanInstallments',
    config: {
      orderBy: [asc(loanInstallments.installmentNumber)],
    },
  },
  loanPayments: {
    relation: 'loanPayments',
    config: {
      with: {
        paymentReceiptType: true,
        glAccount: true,
        loanPaymentMethodAllocations: {
          with: {
            collectionMethod: true,
          },
        },
      },
      orderBy: [desc(loanPayments.paymentDate), desc(loanPayments.id)],
    },
  },
  loanAgreementHistory: {
    relation: 'loanAgreementHistory',
    config: {
      with: {
        agreement: true,
      },
      orderBy: [desc(loanAgreementHistory.changedAt)],
    },
  },
  loanStatusHistory: {
    relation: 'loanStatusHistory',
    config: {
      orderBy: [desc(loanStatusHistory.changedAt)],
    },
  },
});

export const loan = tsr.router(contract.loan, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, LOAN_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.loans.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, LOAN_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)::int` }).from(loans).where(whereClause),
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
        genericMsg: 'Error al listar creditos',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.loans.findFirst({
        where: eq(loans.id, id),
        with: buildTypedIncludes(query?.include, LOAN_INCLUDES),
      });

      if (!item) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return {
        status: 200 as const,
        body: item,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener credito ${id}`,
      });
    }
  },
});
