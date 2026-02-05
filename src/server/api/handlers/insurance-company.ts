import { db, insuranceCompanies, insuranceRateRanges } from '@/server/db';
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

type InsuranceCompanyColumn = keyof typeof insuranceCompanies.$inferSelect;

const INSURANCE_COMPANY_FIELDS: FieldMap = {
  id: insuranceCompanies.id,
  businessName: insuranceCompanies.businessName,
  documentNumber: insuranceCompanies.documentNumber,
  isActive: insuranceCompanies.isActive,
  createdAt: insuranceCompanies.createdAt,
  updatedAt: insuranceCompanies.updatedAt,
} satisfies Partial<
  Record<InsuranceCompanyColumn, (typeof insuranceCompanies)[InsuranceCompanyColumn]>
>;

const INSURANCE_COMPANY_QUERY_CONFIG: QueryConfig = {
  fields: INSURANCE_COMPANY_FIELDS,
  searchFields: [insuranceCompanies.businessName, insuranceCompanies.documentNumber],
  defaultSort: { column: insuranceCompanies.createdAt, order: 'desc' },
};

const INSURANCE_COMPANY_INCLUDES = createIncludeMap<typeof db.query.insuranceCompanies>()({
  insuranceRateRanges: {
    relation: 'insuranceRateRanges',
    config: true,
  },
  identificationType: {
    relation: 'identificationType',
    config: true,
  },
  city: {
    relation: 'city',
    config: true,
  },
  totalChargeDistribution: {
    relation: 'totalChargeDistribution',
    config: true,
  },
  monthlyDistribution: {
    relation: 'monthlyDistribution',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const insuranceCompany = tsr.router(contract.insuranceCompany, {
  // ==========================================
  // LIST - GET /insurance-companies
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
      } = buildQuery({ page, limit, search, where, sort }, INSURANCE_COMPANY_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.insuranceCompanies.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, INSURANCE_COMPANY_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(insuranceCompanies)
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
        genericMsg: 'Error al listar empresas de seguros',
      });
    }
  },

  // ==========================================
  // GET - GET /insurance-companies/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const company = await db.query.insuranceCompanies.findFirst({
        where: eq(insuranceCompanies.id, id),
        with: buildTypedIncludes(query?.include, INSURANCE_COMPANY_INCLUDES),
      });

      if (!company) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: company };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener empresa de seguros ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /insurance-companies
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

      const { insuranceRateRanges: rateRangesData, ...companyData } = body;

      const [created] = await db.transaction(async (tx) => {
        const [company] = await tx.insert(insuranceCompanies).values(companyData).returning();

        if (rateRangesData?.length) {
          await tx.insert(insuranceRateRanges).values(
            rateRangesData.map((range) => ({
              ...range,
              insuranceCompanyId: company.id,
            }))
          );
        }

        return [company];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: created.businessName,
        status: 'success',
        afterValue: {
          ...created,
          _insuranceRateRanges: rateRangesData ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear empresa de seguros',
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
  // UPDATE - PATCH /insurance-companies/:id
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

      const existing = await db.query.insuranceCompanies.findFirst({
        where: eq(insuranceCompanies.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Empresa de seguros con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      // Query existing rate ranges BEFORE update for audit trail
      const existingRateRanges = await db.query.insuranceRateRanges.findMany({
        where: eq(insuranceRateRanges.insuranceCompanyId, id),
      });

      const { insuranceRateRanges: rateRangesData, ...companyData } = body;

      const [updated] = await db.transaction(async (tx) => {
        const [companyUpdated] = await tx
          .update(insuranceCompanies)
          .set(companyData)
          .where(eq(insuranceCompanies.id, id))
          .returning();

        if (rateRangesData) {
          // Delete all existing rate ranges and re-insert
          await tx
            .delete(insuranceRateRanges)
            .where(eq(insuranceRateRanges.insuranceCompanyId, id));

          if (rateRangesData.length) {
            await tx.insert(insuranceRateRanges).values(
              rateRangesData.map((range) => ({
                ...range,
                insuranceCompanyId: id,
              }))
            );
          }
        }

        return [companyUpdated];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: existing.businessName,
        status: 'success',
        beforeValue: {
          ...existing,
          _insuranceRateRanges: existingRateRanges,
        },
        afterValue: {
          ...updated,
          _insuranceRateRanges: rateRangesData ?? existingRateRanges,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar empresa de seguros ${id}`,
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
  // DELETE - DELETE /insurance-companies/:id
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

      const existing = await db.query.insuranceCompanies.findFirst({
        where: eq(insuranceCompanies.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Empresa de seguros con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      // Query existing rate ranges before delete for audit
      const existingRateRanges = await db.query.insuranceRateRanges.findMany({
        where: eq(insuranceRateRanges.insuranceCompanyId, id),
      });

      // Rate ranges will cascade delete via FK
      const [deleted] = await db
        .delete(insuranceCompanies)
        .where(eq(insuranceCompanies.id, id))
        .returning();

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: existing.businessName,
        status: 'success',
        beforeValue: {
          ...existing,
          _insuranceRateRanges: existingRateRanges,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200,
        body: deleted,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar empresa de seguros ${id}`,
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
