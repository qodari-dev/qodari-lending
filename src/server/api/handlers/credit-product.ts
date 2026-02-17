import {
  db,
  creditProducts,
  creditProductCategories,
  creditProductLateInterestRules,
  creditProductDocuments,
  creditProductAccounts,
  creditProductRefinancePolicies,
  creditProductChargeOffPolicies,
  creditProductBillingConcepts,
} from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';

// ============================================
// CONFIG
// ============================================

type CreditProductColumn = keyof typeof creditProducts.$inferSelect;

const CREDIT_PRODUCT_FIELDS: FieldMap = {
  id: creditProducts.id,
  name: creditProducts.name,
  creditFundId: creditProducts.creditFundId,
  financingType: creditProducts.financingType,
  paysInsurance: creditProducts.paysInsurance,
  reportsToCreditBureau: creditProducts.reportsToCreditBureau,
  isActive: creditProducts.isActive,
  createdAt: creditProducts.createdAt,
  updatedAt: creditProducts.updatedAt,
} satisfies Partial<
  Record<CreditProductColumn, (typeof creditProducts)[CreditProductColumn]>
>;

const CREDIT_PRODUCT_QUERY_CONFIG: QueryConfig = {
  fields: CREDIT_PRODUCT_FIELDS,
  searchFields: [creditProducts.name],
  defaultSort: { column: creditProducts.createdAt, order: 'desc' },
};

const CREDIT_PRODUCT_INCLUDES = createIncludeMap<typeof db.query.creditProducts>()({
  creditFund: {
    relation: 'creditFund',
    config: true,
  },
  paymentAllocationPolicy: {
    relation: 'paymentAllocationPolicy',
    config: true,
  },
  capitalDistribution: {
    relation: 'capitalDistribution',
    config: true,
  },
  interestDistribution: {
    relation: 'interestDistribution',
    config: true,
  },
  lateInterestDistribution: {
    relation: 'lateInterestDistribution',
    config: true,
  },
  creditProductRefinancePolicy: {
    relation: 'creditProductRefinancePolicy',
    config: true,
  },
  creditProductChargeOffPolicy: {
    relation: 'creditProductChargeOffPolicy',
    config: true,
  },
  creditProductCategories: {
    relation: 'creditProductCategories',
    config: true,
  },
  creditProductLateInterestRules: {
    relation: 'creditProductLateInterestRules',
    config: true,
  },
  creditProductRequiredDocuments: {
    relation: 'creditProductDocuments',
    config: {
      with: {
        documentType: true,
      },
    },
  },
  creditProductAccounts: {
    relation: 'creditProductAccounts',
    config: {
      with: {
        capitalGlAccount: true,
        interestGlAccount: true,
        lateInterestGlAccount: true,
      },
    },
  },
  creditProductBillingConcepts: {
    relation: 'creditProductBillingConcepts',
    config: {
      with: {
        billingConcept: true,
        overrideBillingConceptRule: true,
        overrideGlAccount: true,
      },
    },
  },
});

// ============================================
// HANDLER
// ============================================

export const creditProduct = tsr.router(contract.creditProduct, {
  // ==========================================
  // LIST - GET /credit-products
  // ==========================================
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, CREDIT_PRODUCT_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.creditProducts.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, CREDIT_PRODUCT_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)::int` }).from(creditProducts).where(whereClause),
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
        genericMsg: 'Error al listar tipos de credito',
      });
    }
  },

  // ==========================================
  // GET - GET /credit-products/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const creditProductItem = await db.query.creditProducts.findFirst({
        where: eq(creditProducts.id, id),
        with: buildTypedIncludes(query?.include, CREDIT_PRODUCT_INCLUDES),
      });

      if (!creditProductItem) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: creditProductItem };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener tipo de credito ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /credit-products
  // ==========================================
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

      const {
        creditProductRefinancePolicy: refinancePolicyData,
        creditProductChargeOffPolicy: chargeOffPolicyData,
        creditProductCategories: categoriesData,
        creditProductLateInterestRules: lateInterestRulesData,
        creditProductRequiredDocuments: requiredDocumentsData,
        creditProductAccounts: accountsData,
        creditProductBillingConcepts: billingConceptsData,
        ...productData
      } = body;

      const [created] = await db.transaction(async (tx) => {
        const [product] = await tx.insert(creditProducts).values(productData).returning();

        if (categoriesData?.length) {
          await tx.insert(creditProductCategories).values(
            categoriesData.map((category) => ({
              ...category,
              creditProductId: product.id,
            }))
          );
        }

        if (lateInterestRulesData?.length) {
          await tx.insert(creditProductLateInterestRules).values(
            lateInterestRulesData.map((rule) => ({
              ...rule,
              creditProductId: product.id,
            }))
          );
        }

        if (requiredDocumentsData?.length) {
          await tx.insert(creditProductDocuments).values(
            requiredDocumentsData.map((requiredDocument) => ({
              ...requiredDocument,
              creditProductId: product.id,
            }))
          );
        }

        if (accountsData?.length) {
          await tx.insert(creditProductAccounts).values(
            accountsData.map((account) => ({
              ...account,
              creditProductId: product.id,
            }))
          );
        }

        if (billingConceptsData?.length) {
          await tx.insert(creditProductBillingConcepts).values(
            billingConceptsData.map((billingConcept) => ({
              ...billingConcept,
              creditProductId: product.id,
            }))
          );
        }

        if (refinancePolicyData) {
          await tx.insert(creditProductRefinancePolicies).values({
            ...refinancePolicyData,
            creditProductId: product.id,
          });
        }

        if (chargeOffPolicyData) {
          await tx.insert(creditProductChargeOffPolicies).values({
            ...chargeOffPolicyData,
            creditProductId: product.id,
          });
        }

        return [product];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: created.name,
        status: 'success',
        afterValue: {
          ...created,
          _creditProductCategories: categoriesData ?? [],
          _creditProductLateInterestRules: lateInterestRulesData ?? [],
          _creditProductRequiredDocuments: requiredDocumentsData ?? [],
          _creditProductAccounts: accountsData ?? [],
          _creditProductBillingConcepts: billingConceptsData ?? [],
          _creditProductRefinancePolicy: refinancePolicyData ?? null,
          _creditProductChargeOffPolicy: chargeOffPolicyData ?? null,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear tipo de credito',
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

  // ==========================================
  // UPDATE - PATCH /credit-products/:id
  // ==========================================
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

      const existing = await db.query.creditProducts.findFirst({
        where: eq(creditProducts.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const [
        existingCategories,
        existingLateInterestRules,
        existingDocuments,
        existingAccounts,
        existingBillingConcepts,
        existingRefinancePolicy,
        existingChargeOffPolicy,
      ] = await Promise.all([
        db.query.creditProductCategories.findMany({
          where: eq(creditProductCategories.creditProductId, id),
        }),
        db.query.creditProductLateInterestRules.findMany({
          where: eq(creditProductLateInterestRules.creditProductId, id),
        }),
        db.query.creditProductDocuments.findMany({
          where: eq(creditProductDocuments.creditProductId, id),
        }),
        db.query.creditProductAccounts.findMany({
          where: eq(creditProductAccounts.creditProductId, id),
        }),
        db.query.creditProductBillingConcepts.findMany({
          where: eq(creditProductBillingConcepts.creditProductId, id),
        }),
        db.query.creditProductRefinancePolicies.findFirst({
          where: eq(creditProductRefinancePolicies.creditProductId, id),
        }),
        db.query.creditProductChargeOffPolicies.findFirst({
          where: eq(creditProductChargeOffPolicies.creditProductId, id),
        }),
      ]);

      const {
        creditProductRefinancePolicy: refinancePolicyData,
        creditProductChargeOffPolicy: chargeOffPolicyData,
        creditProductCategories: categoriesData,
        creditProductLateInterestRules: lateInterestRulesData,
        creditProductRequiredDocuments: requiredDocumentsData,
        creditProductAccounts: accountsData,
        creditProductBillingConcepts: billingConceptsData,
        ...productData
      } = body;

      const [updated] = await db.transaction(async (tx) => {
        const [productUpdated] = await tx
          .update(creditProducts)
          .set(productData)
          .where(eq(creditProducts.id, id))
          .returning();

        if (categoriesData) {
          await tx
            .delete(creditProductCategories)
            .where(eq(creditProductCategories.creditProductId, id));

          if (categoriesData.length) {
            await tx.insert(creditProductCategories).values(
              categoriesData.map((category) => ({
                ...category,
                creditProductId: id,
              }))
            );
          }
        }

        if (lateInterestRulesData) {
          await tx
            .delete(creditProductLateInterestRules)
            .where(eq(creditProductLateInterestRules.creditProductId, id));

          if (lateInterestRulesData.length) {
            await tx.insert(creditProductLateInterestRules).values(
              lateInterestRulesData.map((rule) => ({
                ...rule,
                creditProductId: id,
              }))
            );
          }
        }

        if (requiredDocumentsData) {
          await tx
            .delete(creditProductDocuments)
            .where(eq(creditProductDocuments.creditProductId, id));

          if (requiredDocumentsData.length) {
            await tx.insert(creditProductDocuments).values(
              requiredDocumentsData.map((requiredDocument) => ({
                ...requiredDocument,
                creditProductId: id,
              }))
            );
          }
        }

        if (accountsData) {
          await tx
            .delete(creditProductAccounts)
            .where(eq(creditProductAccounts.creditProductId, id));

          if (accountsData.length) {
            await tx.insert(creditProductAccounts).values(
              accountsData.map((account) => ({
                ...account,
                creditProductId: id,
              }))
            );
          }
        }

        if (billingConceptsData) {
          await tx
            .delete(creditProductBillingConcepts)
            .where(eq(creditProductBillingConcepts.creditProductId, id));

          if (billingConceptsData.length) {
            await tx.insert(creditProductBillingConcepts).values(
              billingConceptsData.map((billingConcept) => ({
                ...billingConcept,
                creditProductId: id,
              }))
            );
          }
        }

        if (refinancePolicyData !== undefined) {
          await tx
            .delete(creditProductRefinancePolicies)
            .where(eq(creditProductRefinancePolicies.creditProductId, id));

          if (refinancePolicyData) {
            await tx.insert(creditProductRefinancePolicies).values({
              ...refinancePolicyData,
              creditProductId: id,
            });
          }
        }

        if (chargeOffPolicyData !== undefined) {
          await tx
            .delete(creditProductChargeOffPolicies)
            .where(eq(creditProductChargeOffPolicies.creditProductId, id));

          if (chargeOffPolicyData) {
            await tx.insert(creditProductChargeOffPolicies).values({
              ...chargeOffPolicyData,
              creditProductId: id,
            });
          }
        }

        return [productUpdated];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: {
          ...existing,
          _creditProductCategories: existingCategories,
          _creditProductLateInterestRules: existingLateInterestRules,
          _creditProductRequiredDocuments: existingDocuments,
          _creditProductAccounts: existingAccounts,
          _creditProductBillingConcepts: existingBillingConcepts,
          _creditProductRefinancePolicy: existingRefinancePolicy ?? null,
          _creditProductChargeOffPolicy: existingChargeOffPolicy ?? null,
        },
        afterValue: {
          ...updated,
          _creditProductCategories: categoriesData ?? existingCategories,
          _creditProductLateInterestRules:
            lateInterestRulesData ?? existingLateInterestRules,
          _creditProductRequiredDocuments: requiredDocumentsData ?? existingDocuments,
          _creditProductAccounts: accountsData ?? existingAccounts,
          _creditProductBillingConcepts:
            billingConceptsData ?? existingBillingConcepts,
          _creditProductRefinancePolicy:
            refinancePolicyData !== undefined
              ? (refinancePolicyData ?? null)
              : (existingRefinancePolicy ?? null),
          _creditProductChargeOffPolicy:
            chargeOffPolicyData !== undefined
              ? (chargeOffPolicyData ?? null)
              : (existingChargeOffPolicy ?? null),
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar tipo de credito ${id}`,
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

  // ==========================================
  // DELETE - DELETE /credit-products/:id
  // ==========================================
  delete: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
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

      const existing = await db.query.creditProducts.findFirst({
        where: eq(creditProducts.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const [
        existingCategories,
        existingLateInterestRules,
        existingDocuments,
        existingAccounts,
        existingBillingConcepts,
        existingRefinancePolicy,
        existingChargeOffPolicy,
      ] = await Promise.all([
        db.query.creditProductCategories.findMany({
          where: eq(creditProductCategories.creditProductId, id),
        }),
        db.query.creditProductLateInterestRules.findMany({
          where: eq(creditProductLateInterestRules.creditProductId, id),
        }),
        db.query.creditProductDocuments.findMany({
          where: eq(creditProductDocuments.creditProductId, id),
        }),
        db.query.creditProductAccounts.findMany({
          where: eq(creditProductAccounts.creditProductId, id),
        }),
        db.query.creditProductBillingConcepts.findMany({
          where: eq(creditProductBillingConcepts.creditProductId, id),
        }),
        db.query.creditProductRefinancePolicies.findFirst({
          where: eq(creditProductRefinancePolicies.creditProductId, id),
        }),
        db.query.creditProductChargeOffPolicies.findFirst({
          where: eq(creditProductChargeOffPolicies.creditProductId, id),
        }),
      ]);

      const [deleted] = await db.delete(creditProducts).where(eq(creditProducts.id, id)).returning();

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: {
          ...existing,
          _creditProductCategories: existingCategories,
          _creditProductLateInterestRules: existingLateInterestRules,
          _creditProductRequiredDocuments: existingDocuments,
          _creditProductAccounts: existingAccounts,
          _creditProductBillingConcepts: existingBillingConcepts,
          _creditProductRefinancePolicy: existingRefinancePolicy ?? null,
          _creditProductChargeOffPolicy: existingChargeOffPolicy ?? null,
        },
        afterValue: {
          ...deleted,
          _creditProductCategories: existingCategories,
          _creditProductLateInterestRules: existingLateInterestRules,
          _creditProductRequiredDocuments: existingDocuments,
          _creditProductAccounts: existingAccounts,
          _creditProductBillingConcepts: existingBillingConcepts,
          _creditProductRefinancePolicy: existingRefinancePolicy ?? null,
          _creditProductChargeOffPolicy: existingChargeOffPolicy ?? null,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar tipo de credito ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        ipAddress,
        userAgent,
      });
      return error;
    }
  },
});
