import { db, identificationTypes, thirdParties } from '@/server/db';
import { getSubsidyWorkerBasicData } from '@/server/services/subsidy/subsidy-service';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { normalizeDocumentNumber, toNullableString } from '@/server/utils/string-utils';
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
import type { ThirdParties } from '@/server/db/types';

// ============================================
// CONFIG
// ============================================

type ThirdPartyColumn = keyof typeof thirdParties.$inferSelect;

const THIRD_PARTY_FIELDS: FieldMap = {
  id: thirdParties.id,
  identificationTypeId: thirdParties.identificationTypeId,
  documentNumber: thirdParties.documentNumber,
  personType: thirdParties.personType,
  firstName: thirdParties.firstName,
  firstLastName: thirdParties.firstLastName,
  businessName: thirdParties.businessName,
  email: thirdParties.email,
  homeAddress: thirdParties.homeAddress,
  homeCityId: thirdParties.homeCityId,
  homePhone: thirdParties.homePhone,
  workAddress: thirdParties.workAddress,
  workCityId: thirdParties.workCityId,
  workPhone: thirdParties.workPhone,
  thirdPartyTypeId: thirdParties.thirdPartyTypeId,
  taxpayerType: thirdParties.taxpayerType,
  hasRut: thirdParties.hasRut,
  createdAt: thirdParties.createdAt,
  updatedAt: thirdParties.updatedAt,
} satisfies Partial<Record<ThirdPartyColumn, (typeof thirdParties)[ThirdPartyColumn]>>;

const THIRD_PARTY_QUERY_CONFIG: QueryConfig = {
  fields: THIRD_PARTY_FIELDS,
  searchFields: [thirdParties.documentNumber, thirdParties.firstName, thirdParties.firstLastName, thirdParties.businessName],
  defaultSort: { column: thirdParties.createdAt, order: 'desc' },
};

const THIRD_PARTY_INCLUDES = createIncludeMap<typeof db.query.thirdParties>()({
  thirdPartyType: {
    relation: 'thirdPartyType',
    config: true,
  },
  identificationType: {
    relation: 'identificationType',
    config: true,
  },
  homeCity: {
    relation: 'homeCity',
    config: true,
  },
  workCity: {
    relation: 'workCity',
    config: true,
  },
  loanApplications: {
    relation: 'loanApplications',
    config: {
      with: {
        creditProduct: true,
      },
    },
  },
  loanApplicationCoDebtors: {
    relation: 'loanApplicationCoDebtors',
    config: {
      with: {
        loanApplication: {
          with: {
            creditProduct: true,
            loans: {
              with: {
                creditFund: true,
              },
            },
          },
        },
      },
    },
  },
  loans: {
    relation: 'loansBorrowed',
    config: {
      with: {
        creditFund: true,
      },
    },
  },
});

function normalizeThirdPartyLoans<T>(item: T): T {
  const candidate = item as T & {
    loans?: unknown[];
    loansBorrowed?: unknown[];
  };

  if (!candidate.loansBorrowed?.length) {
    return item;
  }

  candidate.loans = candidate.loansBorrowed;
  return candidate;
}

type ThirdPartyContactInput = Omit<
  Partial<typeof thirdParties.$inferInsert>,
  | 'homeAddress'
  | 'homeCityId'
  | 'homePhone'
  | 'workAddress'
  | 'workCityId'
  | 'workPhone'
> & {
  homeAddress?: string | null;
  homeCityId?: number | null;
  homePhone?: string | null;
  workAddress?: string | null;
  workCityId?: number | null;
  workPhone?: string | null;
};

function resolveThirdPartyContactPayload(
  input: ThirdPartyContactInput,
  existing?: typeof thirdParties.$inferSelect
) {
  const homeAddress = toNullableString(input.homeAddress) ?? toNullableString(existing?.homeAddress);
  const workAddress = toNullableString(input.workAddress) ?? toNullableString(existing?.workAddress);
  const homeCityId = input.homeCityId ?? existing?.homeCityId ?? null;
  const workCityId = input.workCityId ?? existing?.workCityId ?? null;
  const homePhone = toNullableString(input.homePhone) ?? toNullableString(existing?.homePhone);
  const workPhone = toNullableString(input.workPhone) ?? toNullableString(existing?.workPhone);

  if (homeCityId === null && workCityId === null) {
    throwHttpError({
      status: 400,
      message: 'Debe definir al menos una ciudad (hogar o trabajo)',
      code: 'BAD_REQUEST',
    });
  }

  if (!homePhone && !workPhone) {
    throwHttpError({
      status: 400,
      message: 'Debe definir al menos un telefono (hogar o trabajo)',
      code: 'BAD_REQUEST',
    });
  }

  return {
    ...input,
    homeAddress,
    homeCityId,
    homePhone,
    workAddress,
    workCityId,
    workPhone,
  };
}

// ============================================
// HANDLER
// ============================================

export const thirdParty = tsr.router(contract.thirdParty, {
  // ==========================================
  // LIST - GET /third-parties
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
      } = buildQuery({ page, limit, search, where, sort }, THIRD_PARTY_QUERY_CONFIG);

      const [rawData, countResult] = await Promise.all([
        db.query.thirdParties.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, THIRD_PARTY_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(thirdParties)
          .where(whereClause),
      ]);

      const data = rawData.map((item) => normalizeThirdPartyLoans(item)) as ThirdParties[];
      const totalCount = countResult[0]?.count ?? 0;
      const response = {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
      return response;
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar terceros',
      });
    }
  },

  // ==========================================
  // GET - GET /third-parties/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const thirdParty = await db.query.thirdParties.findFirst({
        where: eq(thirdParties.id, id),
        with: buildTypedIncludes(query?.include, THIRD_PARTY_INCLUDES),
      });

      if (!thirdParty) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: normalizeThirdPartyLoans(thirdParty) as ThirdParties };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener tercero ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /third-parties
  // ==========================================
  create: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const payload = resolveThirdPartyContactPayload(body);

      const [newThirdParty] = await db
        .insert(thirdParties)
        .values(payload as typeof thirdParties.$inferInsert)
        .returning();

      const label = newThirdParty.personType === 'NATURAL'
        ? `${newThirdParty.firstName} ${newThirdParty.firstLastName}`
        : newThirdParty.businessName;

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newThirdParty.id.toString(),
        resourceLabel: `${newThirdParty.documentNumber} - ${label}`,
        status: 'success',
        afterValue: {
          ...newThirdParty,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newThirdParty };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear tercero',
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
  // UPDATE - PATCH /third-parties/:id
  // ==========================================
  update: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const existing = await db.query.thirdParties.findFirst({
        where: eq(thirdParties.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tercero con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const payload = resolveThirdPartyContactPayload(body, existing);

      const [updated] = await db
        .update(thirdParties)
        .set(payload)
        .where(eq(thirdParties.id, id))
        .returning();

      const label = existing.personType === 'NATURAL'
        ? `${existing.firstName} ${existing.firstLastName}`
        : existing.businessName;

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.documentNumber} - ${label}`,
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
        genericMsg: `Error al actualizar tercero ${id}`,
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

  lookupSubsidy: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const identificationType = await db.query.identificationTypes.findFirst({
        where: eq(identificationTypes.id, body.identificationTypeId),
      });

      if (!identificationType) {
        throwHttpError({
          status: 404,
          message: 'Tipo de documento no encontrado',
          code: 'NOT_FOUND',
        });
      }

      const result = await getSubsidyWorkerBasicData({
        identificationTypeCode: identificationType.code,
        documentNumber: normalizeDocumentNumber(body.documentNumber),
      });

      if (!result) {
        throwHttpError({
          status: 404,
          message: 'No se encontro informacion de subsidio para ese documento',
          code: 'NOT_FOUND',
        });
      }

      return {
        status: 200 as const,
        body: {
          source: result.source,
          worker: {
            fullName: result.worker.fullName,
            firstName: result.worker.firstName,
            secondName: result.worker.secondName,
            firstLastName: result.worker.firstLastName,
            secondLastName: result.worker.secondLastName,
            documentNumber: result.worker.documentNumber,
            identificationTypeCode: result.worker.identificationTypeCode,
            categoryCode: result.worker.categoryCode,
            sex: result.worker.sex,
            address: result.worker.address,
            phone: result.worker.phone,
            email: result.worker.email,
          },
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al consultar informacion de subsidio del tercero',
      });
    }
  },

  // ==========================================
  // DELETE - DELETE /third-parties/:id
  // ==========================================
  delete: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const existing = await db.query.thirdParties.findFirst({
        where: eq(thirdParties.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tercero con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(thirdParties).where(eq(thirdParties.id, id));

      const label = existing.personType === 'NATURAL'
        ? `${existing.firstName} ${existing.firstLastName}`
        : existing.businessName;

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.documentNumber} - ${label}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200,
        body: existing,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar tercero ${id}`,
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
