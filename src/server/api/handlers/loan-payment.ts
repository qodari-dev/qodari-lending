import {
  db,
  loanPaymentMethodAllocations,
  loanPayments,
  loans,
  paymentTenderTypes,
  userPaymentReceiptTypes,
} from '@/server/db';
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
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { formatDateOnly, toDecimalString } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type LoanPaymentColumn = keyof typeof loanPayments.$inferSelect;

const LOAN_PAYMENT_FIELDS: FieldMap = {
  id: loanPayments.id,
  paymentNumber: loanPayments.paymentNumber,
  paymentDate: loanPayments.paymentDate,
  loanId: loanPayments.loanId,
  receiptTypeId: loanPayments.receiptTypeId,
  status: loanPayments.status,
  amount: loanPayments.amount,
  createdAt: loanPayments.createdAt,
  updatedAt: loanPayments.updatedAt,
} satisfies Partial<Record<LoanPaymentColumn, (typeof loanPayments)[LoanPaymentColumn]>>;

const LOAN_PAYMENT_QUERY_CONFIG: QueryConfig = {
  fields: LOAN_PAYMENT_FIELDS,
  searchFields: [loanPayments.paymentNumber, loanPayments.description],
  defaultSort: { column: loanPayments.createdAt, order: 'desc' },
};

const LOAN_PAYMENT_INCLUDES = createIncludeMap<typeof db.query.loanPayments>()({
  loan: {
    relation: 'loan',
    config: {
      with: {
        borrower: true,
      },
    },
  },
  paymentReceiptType: {
    relation: 'paymentReceiptType',
    config: {
      with: {
        glAccount: true,
      },
    },
  },
  glAccount: {
    relation: 'glAccount',
    config: true,
  },
  loanPaymentMethodAllocations: {
    relation: 'loanPaymentMethodAllocations',
    config: {
      with: {
        collectionMethod: true,
      },
    },
  },
});

function buildPaymentNumber(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const rnd = String(Math.floor(Math.random() * 900) + 100);
  return `AB${yy}${mm}${dd}${hh}${mi}${ss}${rnd}`;
}

async function ensureUniquePaymentNumber(receiptTypeId: number): Promise<string> {
  for (let index = 0; index < 10; index += 1) {
    const paymentNumber = buildPaymentNumber();
    const exists = await db.query.loanPayments.findFirst({
      where: and(
        eq(loanPayments.receiptTypeId, receiptTypeId),
        eq(loanPayments.paymentNumber, paymentNumber)
      ),
      columns: { id: true },
    });

    if (!exists) {
      return paymentNumber;
    }
  }

  throwHttpError({
    status: 500,
    message: 'No fue posible generar consecutivo del abono',
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export const loanPayment = tsr.router(contract.loanPayment, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, LOAN_PAYMENT_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.loanPayments.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, LOAN_PAYMENT_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)::int` }).from(loanPayments).where(whereClause),
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
        genericMsg: 'Error al listar abonos',
      });
    }
  },

  listAvailableReceiptTypes: async (_args, { request, appRoute }) => {
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

      const rows = await db.query.userPaymentReceiptTypes.findMany({
        where: eq(userPaymentReceiptTypes.userId, userId),
        with: {
          paymentReceiptType: {
            with: {
              glAccount: true,
            },
          },
        },
      });

      const data = rows
        .filter((row) => row.paymentReceiptType?.isActive)
        .map((row) => ({
          assignmentId: row.id,
          paymentReceiptTypeId: row.paymentReceiptTypeId,
          name: row.paymentReceiptType?.name ?? String(row.paymentReceiptTypeId),
          movementType: row.paymentReceiptType?.movementType ?? 'RECEIPT',
          isDefault: row.isDefault,
          glAccountId: row.paymentReceiptType?.glAccountId ?? 0,
          glAccountName:
            row.paymentReceiptType?.glAccount?.name ?? String(row.paymentReceiptType?.glAccountId ?? ''),
        }))
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));

      return {
        status: 200 as const,
        body: data,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al consultar tipos de recibo habilitados',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.loanPayments.findFirst({
        where: eq(loanPayments.id, id),
        with: buildTypedIncludes(query?.include, LOAN_PAYMENT_INCLUDES),
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
        genericMsg: `Error al obtener abono ${id}`,
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

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, body.loanId),
        columns: { id: true },
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${body.loanId} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const availableReceiptType = await db.query.userPaymentReceiptTypes.findFirst({
        where: and(
          eq(userPaymentReceiptTypes.userId, userId),
          eq(userPaymentReceiptTypes.paymentReceiptTypeId, body.receiptTypeId)
        ),
        with: {
          paymentReceiptType: true,
        },
      });

      if (!availableReceiptType || !availableReceiptType.paymentReceiptType) {
        throwHttpError({
          status: 400,
          message: 'El tipo de recibo seleccionado no esta habilitado para el usuario actual',
          code: 'BAD_REQUEST',
        });
      }

      if (!availableReceiptType.paymentReceiptType.isActive) {
        throwHttpError({
          status: 400,
          message: 'El tipo de recibo seleccionado esta inactivo',
          code: 'BAD_REQUEST',
        });
      }

      const collectionMethodIds = [
        ...new Set(body.loanPaymentMethodAllocations.map((item) => item.collectionMethodId)),
      ];

      if (!collectionMethodIds.length) {
        throwHttpError({
          status: 400,
          message: 'Debe registrar al menos una forma de pago',
          code: 'BAD_REQUEST',
        });
      }

      const activeCollectionMethods = await db.query.paymentTenderTypes.findMany({
        where: and(
          inArray(paymentTenderTypes.id, collectionMethodIds),
          eq(paymentTenderTypes.isActive, true)
        ),
        columns: {
          id: true,
        },
      });

      if (activeCollectionMethods.length !== collectionMethodIds.length) {
        throwHttpError({
          status: 400,
          message: 'Una o mas formas de pago son invalidas o estan inactivas',
          code: 'BAD_REQUEST',
        });
      }

      const paymentNumber = await ensureUniquePaymentNumber(body.receiptTypeId);
      const nowDate = formatDateOnly(new Date());

      const [created] = await db.transaction(async (tx) => {
        const [createdLoanPayment] = await tx
          .insert(loanPayments)
          .values({
            receiptTypeId: body.receiptTypeId,
            paymentNumber,
            movementType: availableReceiptType.paymentReceiptType?.movementType,
            paymentDate: formatDateOnly(body.paymentDate),
            issuedDate: nowDate,
            loanId: body.loanId,
            description: body.description,
            amount: toDecimalString(body.amount),
            status: 'PAID',
            statusDate: nowDate,
            createdByUserId: userId,
            createdByUserName: userName,
            note: body.note?.trim() ? body.note.trim() : null,
            glAccountId: availableReceiptType.paymentReceiptType?.glAccountId,
          })
          .returning();

        await tx.insert(loanPaymentMethodAllocations).values(
          body.loanPaymentMethodAllocations.map((item, index) => ({
            loanPaymentId: createdLoanPayment.id,
            collectionMethodId: item.collectionMethodId,
            lineNumber: index + 1,
            tenderReference: item.tenderReference?.trim() ? item.tenderReference.trim() : null,
            amount: toDecimalString(item.amount),
          }))
        );

        return [createdLoanPayment];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: created.paymentNumber,
        status: 'success',
        afterValue: {
          ...created,
          _loanPaymentMethodAllocations: body.loanPaymentMethodAllocations,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 201 as const,
        body: created,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear abono',
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  void: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
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

      const existing = await db.query.loanPayments.findFirst({
        where: eq(loanPayments.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Abono con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (existing.status === 'VOID') {
        throwHttpError({
          status: 400,
          message: 'El abono ya esta anulado',
          code: 'BAD_REQUEST',
        });
      }

      const [updated] = await db
        .update(loanPayments)
        .set({
          status: 'VOID',
          statusDate: formatDateOnly(new Date()),
          noteStatus: body.noteStatus.trim(),
          updatedByUserId: userId,
          updatedByUserName: userName,
        })
        .where(eq(loanPayments.id, id))
        .returning();

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'void',
        resourceId: existing.id.toString(),
        resourceLabel: existing.paymentNumber,
        status: 'success',
        beforeValue: existing,
        afterValue: updated,
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updated,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al anular abono ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'void',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },
});
