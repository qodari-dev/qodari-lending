import { db, agreements, billingCycleProfiles } from '@/server/db';
import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { formatDateOnly, toDbDate } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type AgreementColumn = keyof typeof agreements.$inferSelect;

const AGREEMENT_FIELDS: FieldMap = {
  id: agreements.id,
  agreementCode: agreements.agreementCode,
  documentNumber: agreements.documentNumber,
  businessName: agreements.businessName,
  cityId: agreements.cityId,
  address: agreements.address,
  phone: agreements.phone,
  legalRepresentative: agreements.legalRepresentative,
  startDate: agreements.startDate,
  endDate: agreements.endDate,
  note: agreements.note,
  isActive: agreements.isActive,
  statusDate: agreements.statusDate,
  createdAt: agreements.createdAt,
  updatedAt: agreements.updatedAt,
} satisfies Partial<Record<AgreementColumn, (typeof agreements)[AgreementColumn]>>;

const AGREEMENT_QUERY_CONFIG: QueryConfig = {
  fields: AGREEMENT_FIELDS,
  searchFields: [agreements.agreementCode, agreements.documentNumber, agreements.businessName],
  defaultSort: { column: agreements.createdAt, order: 'desc' },
};

const AGREEMENT_INCLUDES = createIncludeMap<typeof db.query.agreements>()({
  city: {
    relation: 'city',
    config: true,
  },
  billingCycleProfiles: {
    relation: 'billingCycleProfiles',
    config: {
      with: {
        billingCycleProfileCycles: true,
      },
    },
  },
});

function normalizePayload(
  payload: Partial<{
    agreementCode: string;
    documentNumber: string;
    businessName: string;
    cityId: number;
    address: string | null;
    phone: string | null;
    legalRepresentative: string | null;
    startDate: Date;
    endDate: Date | null;
    note: string | null;
    isActive: boolean;
  }>
) {
  return {
    ...payload,
    agreementCode: payload.agreementCode?.trim().toUpperCase(),
    documentNumber: payload.documentNumber?.trim(),
    businessName: payload.businessName?.trim(),
    address: payload.address === undefined ? undefined : payload.address?.trim() || null,
    phone: payload.phone === undefined ? undefined : payload.phone?.trim() || null,
    legalRepresentative:
      payload.legalRepresentative === undefined
        ? undefined
        : payload.legalRepresentative?.trim() || null,
    note: payload.note === undefined ? undefined : payload.note?.trim() || null,
    startDate: payload.startDate ? formatDateOnly(payload.startDate) : undefined,
    endDate: toDbDate(payload.endDate),
  };
}

export const agreement = tsr.router(contract.agreement, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, AGREEMENT_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.agreements.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, AGREEMENT_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(agreements)
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
        genericMsg: 'Error al listar convenios',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.agreements.findFirst({
        where: eq(agreements.id, id),
        with: buildTypedIncludes(query?.include, AGREEMENT_INCLUDES),
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
        genericMsg: `Error al obtener convenio ${id}`,
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

      const payload = {
        agreementCode: body.agreementCode.trim().toUpperCase(),
        documentNumber: body.documentNumber.trim(),
        businessName: body.businessName.trim(),
        cityId: body.cityId,
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        legalRepresentative: body.legalRepresentative?.trim() || null,
        startDate: formatDateOnly(body.startDate),
        endDate: toDbDate(body.endDate),
        note: body.note?.trim() || null,
        isActive: body.isActive,
        statusDate: formatDateOnly(new Date()),
      };

      const newItem = await db.transaction(async (tx) => {
        const [created] = await tx.insert(agreements).values(payload).returning();
        return created;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newItem.id.toString(),
        resourceLabel: `${newItem.agreementCode} - ${newItem.businessName}`,
        status: 'success',
        afterValue: {
          ...newItem,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 201 as const,
        body: newItem,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear convenio',
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { body },
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

      const existing = await db.query.agreements.findFirst({
        where: eq(agreements.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Convenio con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const payload = normalizePayload(body);
      const isStatusChanging =
        payload.isActive !== undefined && payload.isActive !== existing.isActive;
      const payloadToUpdate = {
        ...payload,
        ...(isStatusChanging ? { statusDate: formatDateOnly(new Date()) } : {}),
      };

      const updated = await db.transaction(async (tx) => {
        const [item] = await tx
          .update(agreements)
          .set(payloadToUpdate)
          .where(eq(agreements.id, id))
          .returning();

        return item;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.agreementCode} - ${existing.businessName}`,
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

      return {
        status: 200 as const,
        body: updated,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar convenio ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

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

      const existing = await db.query.agreements.findFirst({
        where: eq(agreements.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Convenio con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const hasProfiles = await db.query.billingCycleProfiles.findFirst({
        where: eq(billingCycleProfiles.agreementId, id),
      });

      if (hasProfiles) {
        throwHttpError({
          status: 400,
          message: 'No se puede eliminar el convenio porque tiene perfiles de ciclo asociados',
          code: 'BAD_REQUEST',
        });
      }

      await db.delete(agreements).where(eq(agreements.id, id));

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.agreementCode} - ${existing.businessName}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: existing,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar convenio ${id}`,
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
