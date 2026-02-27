import { db, loanApprovalLevels, loanApprovalLevelUsers, loanApplications } from '@/server/db';
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
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { toDecimalString, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { asc, eq, or, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type LoanApprovalLevelColumn = keyof typeof loanApprovalLevels.$inferSelect;

const LOAN_APPROVAL_LEVEL_FIELDS: FieldMap = {
  id: loanApprovalLevels.id,
  name: loanApprovalLevels.name,
  levelOrder: loanApprovalLevels.levelOrder,
  isActive: loanApprovalLevels.isActive,
  createdAt: loanApprovalLevels.createdAt,
  updatedAt: loanApprovalLevels.updatedAt,
} satisfies Partial<
  Record<LoanApprovalLevelColumn, (typeof loanApprovalLevels)[LoanApprovalLevelColumn]>
>;

const LOAN_APPROVAL_LEVEL_QUERY_CONFIG: QueryConfig = {
  fields: LOAN_APPROVAL_LEVEL_FIELDS,
  searchFields: [loanApprovalLevels.name],
  defaultSort: { column: loanApprovalLevels.levelOrder, order: 'asc' },
};

const LOAN_APPROVAL_LEVEL_INCLUDES = createIncludeMap<typeof db.query.loanApprovalLevels>()({
  users: {
    relation: 'users',
    config: {
      orderBy: [asc(loanApprovalLevelUsers.sortOrder), asc(loanApprovalLevelUsers.id)],
    },
  },
});

function normalizePayload(
  payload: Partial<{
    name: string;
    levelOrder: number;
    maxApprovalAmount: string | null;
    isActive: boolean;
    users: Array<{
      userId: string;
      userName: string;
      sortOrder: number;
      isActive: boolean;
    }>;
  }>
) {
  return {
    ...payload,
    name: payload.name?.trim(),
    maxApprovalAmount:
      payload.maxApprovalAmount === undefined
        ? undefined
        : payload.maxApprovalAmount === null
          ? null
          : toDecimalString(payload.maxApprovalAmount),
    users: payload.users?.map((user) => ({
      ...user,
      userName: user.userName.trim(),
      sortOrder: user.sortOrder ?? 0,
      isActive: user.isActive ?? true,
    })),
  };
}

async function ensureNoAmountOrderConflict(
  candidateId: number | null,
  candidate: {
    levelOrder: number;
    isActive: boolean;
    maxApprovalAmount: string | null;
  }
) {
  const existing = await db.query.loanApprovalLevels.findMany({
    columns: {
      id: true,
      levelOrder: true,
      maxApprovalAmount: true,
      isActive: true,
    },
  });

  const merged = existing.map((level) => {
    if (candidateId !== null && level.id === candidateId) {
      return {
        ...level,
        levelOrder: candidate.levelOrder,
        maxApprovalAmount: candidate.maxApprovalAmount,
        isActive: candidate.isActive,
      };
    }
    return level;
  });

  if (candidateId === null) {
    merged.push({
      id: -1,
      levelOrder: candidate.levelOrder,
      maxApprovalAmount: candidate.maxApprovalAmount,
      isActive: candidate.isActive,
    });
  }

  const active = merged
    .filter((level) => level.isActive)
    .sort((a, b) => a.levelOrder - b.levelOrder);

  let previousAmount = -1;
  for (let index = 0; index < active.length; index += 1) {
    const level = active[index];
    const isLast = index === active.length - 1;

    if (level.maxApprovalAmount === null) {
      if (!isLast) {
        throwHttpError({
          status: 400,
          message: 'Solo el ultimo nivel activo puede tener tope de monto vacio',
          code: 'BAD_REQUEST',
        });
      }
      continue;
    }

    const amount = toNumber(level.maxApprovalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throwHttpError({
        status: 400,
        message: 'Tope de monto invalido',
        code: 'BAD_REQUEST',
      });
    }

    if (amount <= previousAmount) {
      throwHttpError({
        status: 400,
        message: 'Los topes de monto deben ser ascendentes por nivel',
        code: 'BAD_REQUEST',
      });
    }

    previousAmount = amount;
  }
}

function hasActiveUser(
  users:
    | Array<{
        isActive: boolean;
      }>
    | undefined
) {
  if (!users) return false;
  return users.some((user) => user.isActive);
}

export const loanApprovalLevel = tsr.router(contract.loanApprovalLevel, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;
      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, LOAN_APPROVAL_LEVEL_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.loanApprovalLevels.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, LOAN_APPROVAL_LEVEL_INCLUDES),
          orderBy: orderBy.length ? orderBy : [asc(loanApprovalLevels.levelOrder)],
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(loanApprovalLevels)
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
        genericMsg: 'Error al listar niveles de aprobacion',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.loanApprovalLevels.findFirst({
        where: eq(loanApprovalLevels.id, id),
        with: buildTypedIncludes(query?.include, LOAN_APPROVAL_LEVEL_INCLUDES),
      });

      if (!item) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200 as const, body: item };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener nivel de aprobacion ${id}`,
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

      const payload = normalizePayload(body);
      if (!payload.users?.length || !hasActiveUser(payload.users)) {
        throwHttpError({
          status: 400,
          message: 'Debe definir al menos un usuario activo por nivel',
          code: 'BAD_REQUEST',
        });
      }

      await ensureNoAmountOrderConflict(null, {
        levelOrder: payload.levelOrder!,
        isActive: payload.isActive ?? true,
        maxApprovalAmount: payload.maxApprovalAmount ?? null,
      });

      const [created] = await db.transaction(async (tx) => {
        const [createdLevel] = await tx
          .insert(loanApprovalLevels)
          .values({
            name: payload.name!,
            levelOrder: payload.levelOrder!,
            maxApprovalAmount: payload.maxApprovalAmount ?? null,
            isActive: payload.isActive ?? true,
          })
          .returning();

        await tx.insert(loanApprovalLevelUsers).values(
          payload.users!.map((user) => ({
            loanApprovalLevelId: createdLevel.id,
            userId: user.userId,
            userName: user.userName,
            sortOrder: user.sortOrder,
            isActive: user.isActive,
          }))
        );

        const withUsers = await tx.query.loanApprovalLevels.findFirst({
          where: eq(loanApprovalLevels.id, createdLevel.id),
          with: {
            users: {
              orderBy: [asc(loanApprovalLevelUsers.sortOrder), asc(loanApprovalLevelUsers.id)],
            },
          },
        });

        if (!withUsers) {
          throwHttpError({
            status: 500,
            message: 'No fue posible crear nivel de aprobacion',
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        return [withUsers];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: created.name,
        status: 'success',
        afterValue: created,
        ipAddress,
        userAgent,
      });

      return { status: 201 as const, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear nivel de aprobacion',
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error.body.message,
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

      const existing = await db.query.loanApprovalLevels.findFirst({
        where: eq(loanApprovalLevels.id, id),
        with: {
          users: true,
        },
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Nivel con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const payload = normalizePayload(body);
      const nextState = {
        levelOrder: payload.levelOrder ?? existing.levelOrder,
        isActive: payload.isActive ?? existing.isActive,
        maxApprovalAmount:
          payload.maxApprovalAmount === undefined
            ? (existing.maxApprovalAmount ?? null)
            : payload.maxApprovalAmount,
      };

      await ensureNoAmountOrderConflict(id, nextState);

      const nextUsers = payload.users ?? existing.users;
      if (nextState.isActive && (!nextUsers.length || !hasActiveUser(nextUsers))) {
        throwHttpError({
          status: 400,
          message: 'Debe definir al menos un usuario activo por nivel activo',
          code: 'BAD_REQUEST',
        });
      }

      const [updated] = await db.transaction(async (tx) => {
        const updatePayload: Partial<typeof loanApprovalLevels.$inferInsert> = {};

        if (payload.name !== undefined) updatePayload.name = payload.name;
        if (payload.levelOrder !== undefined) updatePayload.levelOrder = payload.levelOrder;
        if (payload.maxApprovalAmount !== undefined) {
          updatePayload.maxApprovalAmount = payload.maxApprovalAmount;
        }
        if (payload.isActive !== undefined) updatePayload.isActive = payload.isActive;

        if (Object.keys(updatePayload).length) {
          await tx
            .update(loanApprovalLevels)
            .set(updatePayload)
            .where(eq(loanApprovalLevels.id, id));
        }

        if (payload.users !== undefined) {
          await tx
            .delete(loanApprovalLevelUsers)
            .where(eq(loanApprovalLevelUsers.loanApprovalLevelId, id));
          if (payload.users.length) {
            await tx.insert(loanApprovalLevelUsers).values(
              payload.users.map((user) => ({
                loanApprovalLevelId: id,
                userId: user.userId,
                userName: user.userName,
                sortOrder: user.sortOrder,
                isActive: user.isActive,
              }))
            );
          }
        }

        const withUsers = await tx.query.loanApprovalLevels.findFirst({
          where: eq(loanApprovalLevels.id, id),
          with: {
            users: {
              orderBy: [asc(loanApprovalLevelUsers.sortOrder), asc(loanApprovalLevelUsers.id)],
            },
          },
        });

        if (!withUsers) {
          throwHttpError({
            status: 500,
            message: 'No fue posible actualizar nivel de aprobacion',
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        return [withUsers];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: existing,
        afterValue: updated,
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar nivel ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
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

      const existing = await db.query.loanApprovalLevels.findFirst({
        where: eq(loanApprovalLevels.id, id),
        with: {
          users: true,
        },
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Nivel con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const linkedApplication = await db.query.loanApplications.findFirst({
        where: or(
          eq(loanApplications.currentApprovalLevelId, id),
          eq(loanApplications.targetApprovalLevelId, id)
        ),
        columns: { id: true, creditNumber: true },
      });

      if (linkedApplication) {
        throwHttpError({
          status: 409,
          message: `No se puede eliminar porque el nivel esta asignado a la solicitud ${linkedApplication.creditNumber}`,
          code: 'CONFLICT',
        });
      }

      await db.delete(loanApprovalLevels).where(eq(loanApprovalLevels.id, id));

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: existing,
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: existing };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar nivel ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        ipAddress,
        userAgent,
      });

      return error;
    }
  },
});
