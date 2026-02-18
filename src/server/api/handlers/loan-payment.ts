import {
  accountingEntries,
  db,
  glAccounts,
  loanPaymentMethodAllocations,
  loanPayments,
  loanStatusHistory,
  loans,
  paymentTenderTypes,
  portfolioEntries,
  userPaymentReceiptTypes,
} from '@/server/db';
import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import {
  buildPaymentDocumentCode,
  buildPaymentVoidDocumentCode,
  mapPaymentMovementTypeToProcessType,
} from '@/server/utils/accounting-utils';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
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

function buildPaymentNumber(prefix: string): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const rnd = String(Math.floor(Math.random() * 900) + 100);
  const normalizedPrefix = prefix.trim().toUpperCase();
  return `${normalizedPrefix}${yy}${mm}${dd}${hh}${mi}${ss}${rnd}`;
}

async function ensureUniquePaymentNumber(args: {
  receiptTypeId: number;
  prefix: string;
}): Promise<string> {
  for (let index = 0; index < 10; index += 1) {
    const paymentNumber = buildPaymentNumber(args.prefix);
    const exists = await db.query.loanPayments.findFirst({
      where: and(
        eq(loanPayments.receiptTypeId, args.receiptTypeId),
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
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(loanPayments)
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
            row.paymentReceiptType?.glAccount?.name ??
            String(row.paymentReceiptType?.glAccountId ?? ''),
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
        columns: {
          id: true,
          creditNumber: true,
          thirdPartyId: true,
          costCenterId: true,
          status: true,
        },
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${body.loanId} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (!['ACTIVE', 'ACCOUNTED'].includes(existingLoan.status)) {
        throwHttpError({
          status: 400,
          message: 'El credito debe estar activo para recibir abonos',
          code: 'BAD_REQUEST',
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

      const receiptTypeCode = availableReceiptType.paymentReceiptType.code?.trim().toUpperCase();
      if (!receiptTypeCode) {
        throwHttpError({
          status: 400,
          message: 'El tipo de recibo seleccionado no tiene codigo configurado',
          code: 'BAD_REQUEST',
        });
      }

      const selectedGlAccountId =
        body.glAccountId ?? availableReceiptType.paymentReceiptType.glAccountId;
      if (!selectedGlAccountId) {
        throwHttpError({
          status: 400,
          message: 'Debe seleccionar un auxiliar contable',
          code: 'BAD_REQUEST',
        });
      }

      const selectedGlAccount = await db.query.glAccounts.findFirst({
        where: and(eq(glAccounts.id, selectedGlAccountId), eq(glAccounts.isActive, true)),
        columns: { id: true },
      });

      if (!selectedGlAccount) {
        throwHttpError({
          status: 400,
          message: 'El auxiliar contable seleccionado es invalido o esta inactivo',
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

      const paymentDate = formatDateOnly(body.paymentDate);
      const requestedPaymentAmount = roundMoney(toNumber(body.amount));
      if (!Number.isFinite(requestedPaymentAmount) || requestedPaymentAmount <= 0) {
        throwHttpError({
          status: 400,
          message: 'El valor del abono es invalido',
          code: 'BAD_REQUEST',
        });
      }
      const providedOverpaidAmount = roundMoney(Number(body.overpaidAmount ?? 0));

      const openPortfolio = await db.query.portfolioEntries.findMany({
        where: and(
          eq(portfolioEntries.loanId, body.loanId),
          eq(portfolioEntries.status, 'OPEN'),
          sql`${portfolioEntries.balance} > 0`
        ),
        orderBy: [
          asc(portfolioEntries.dueDate),
          asc(portfolioEntries.installmentNumber),
          asc(portfolioEntries.id),
        ],
      });

      if (!openPortfolio.length) {
        throwHttpError({
          status: 400,
          message: 'El credito no tiene saldo de cartera para aplicar abonos',
          code: 'BAD_REQUEST',
        });
      }

      const totalOutstanding = roundMoney(
        openPortfolio.reduce((acc, row) => acc + toNumber(row.balance), 0)
      );

      const appliedPaymentAmount = roundMoney(Math.min(requestedPaymentAmount, totalOutstanding));
      const overflowByCap = roundMoney(Math.max(0, requestedPaymentAmount - appliedPaymentAmount));
      const overpaidAmount = roundMoney(Math.max(0, providedOverpaidAmount) + overflowByCap);

      if (!Number.isFinite(appliedPaymentAmount) || appliedPaymentAmount <= 0) {
        throwHttpError({
          status: 400,
          message: 'No hay saldo pendiente para aplicar al abono',
          code: 'BAD_REQUEST',
        });
      }

      const portfolioApplications: Array<{
        glAccountId: number;
        installmentNumber: number;
        dueDate: string;
        amount: number;
      }> = [];

      let remainingAmount = appliedPaymentAmount;
      for (const row of openPortfolio) {
        if (remainingAmount <= 0.01) break;
        const rowBalance = roundMoney(toNumber(row.balance));
        if (rowBalance <= 0) continue;
        const appliedAmount = roundMoney(Math.min(remainingAmount, rowBalance));
        if (appliedAmount <= 0) continue;

        portfolioApplications.push({
          glAccountId: row.glAccountId,
          installmentNumber: row.installmentNumber,
          dueDate: row.dueDate,
          amount: appliedAmount,
        });
        remainingAmount = roundMoney(remainingAmount - appliedAmount);
      }

      if (remainingAmount > 0.01) {
        throwHttpError({
          status: 400,
          message: 'No fue posible aplicar completamente el valor del abono',
          code: 'BAD_REQUEST',
        });
      }

      const paymentNumber = await ensureUniquePaymentNumber({
        receiptTypeId: body.receiptTypeId,
        prefix: receiptTypeCode,
      });
      const nowDate = formatDateOnly(new Date());

      const [created] = await db.transaction(async (tx) => {
        const [createdLoanPayment] = await tx
          .insert(loanPayments)
          .values({
            receiptTypeId: body.receiptTypeId,
            paymentNumber,
            movementType: availableReceiptType.paymentReceiptType?.movementType,
            paymentDate,
            issuedDate: nowDate,
            loanId: body.loanId,
            description: body.description,
            amount: toDecimalString(appliedPaymentAmount),
            overpaidAmount: overpaidAmount > 0 ? Math.round(overpaidAmount) : null,
            status: 'PAID',
            statusDate: nowDate,
            createdByUserId: userId,
            createdByUserName: userName,
            note: body.note?.trim() ? body.note.trim() : null,
            glAccountId: selectedGlAccountId,
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

        const accountingDocumentCode = buildPaymentDocumentCode(createdLoanPayment.id);
        const processType = mapPaymentMovementTypeToProcessType(
          availableReceiptType.paymentReceiptType.movementType
        );

        let sequence = 1;
        const accountingPayload: Array<typeof accountingEntries.$inferInsert> = [
          {
            processType,
            documentCode: accountingDocumentCode,
            sequence,
            entryDate: paymentDate,
            glAccountId: selectedGlAccountId,
            costCenterId: existingLoan.costCenterId ?? null,
            thirdPartyId: existingLoan.thirdPartyId,
            description: `Abono ${paymentNumber} credito ${existingLoan.creditNumber}`.slice(
              0,
              255
            ),
            nature: 'DEBIT',
            amount: toDecimalString(appliedPaymentAmount),
            loanId: existingLoan.id,
            status: 'DRAFT',
            statusDate: nowDate,
            sourceType: 'LOAN_PAYMENT',
            sourceId: String(createdLoanPayment.id),
          },
        ];
        sequence += 1;

        for (const row of portfolioApplications) {
          accountingPayload.push({
            processType,
            documentCode: accountingDocumentCode,
            sequence,
            entryDate: paymentDate,
            glAccountId: row.glAccountId,
            costCenterId: null,
            thirdPartyId: existingLoan.thirdPartyId,
            description:
              `Abono ${paymentNumber} credito ${existingLoan.creditNumber} cuota ${row.installmentNumber}`.slice(
                0,
                255
              ),
            nature: 'CREDIT',
            amount: toDecimalString(row.amount),
            loanId: existingLoan.id,
            installmentNumber: row.installmentNumber,
            dueDate: row.dueDate,
            status: 'DRAFT',
            statusDate: nowDate,
            sourceType: 'LOAN_PAYMENT',
            sourceId: String(createdLoanPayment.id),
          });
          sequence += 1;
        }

        const debitTotal = roundMoney(
          accountingPayload
            .filter((entry) => entry.nature === 'DEBIT')
            .reduce((acc, entry) => acc + toNumber(entry.amount), 0)
        );
        const creditTotal = roundMoney(
          accountingPayload
            .filter((entry) => entry.nature === 'CREDIT')
            .reduce((acc, entry) => acc + toNumber(entry.amount), 0)
        );

        if (Math.abs(debitTotal - creditTotal) > 0.01) {
          throwHttpError({
            status: 400,
            message: 'El abono no cuadra contablemente',
            code: 'BAD_REQUEST',
          });
        }

        await tx.insert(accountingEntries).values(accountingPayload);

        console.log('Portfolio application', portfolioApplications);
        await applyPortfolioDeltas(tx, {
          movementDate: paymentDate,
          deltas: portfolioApplications.map((row) => ({
            glAccountId: row.glAccountId,
            thirdPartyId: existingLoan.thirdPartyId,
            loanId: existingLoan.id,
            installmentNumber: row.installmentNumber,
            dueDate: row.dueDate,
            chargeDelta: 0,
            paymentDelta: row.amount,
          })),
        });

        await tx
          .update(loans)
          .set({
            lastPaymentDate: paymentDate,
          })
          .where(eq(loans.id, existingLoan.id));

        const remaining = await tx
          .select({
            balance: sql<string>`coalesce(sum(${portfolioEntries.balance}), 0)`,
          })
          .from(portfolioEntries)
          .where(
            and(
              eq(portfolioEntries.loanId, existingLoan.id),
              eq(portfolioEntries.status, 'OPEN'),
              sql`${portfolioEntries.balance} > 0`
            )
          );

        const remainingBalance = roundMoney(toNumber(remaining[0]?.balance ?? '0'));
        if (remainingBalance <= 0.01 && existingLoan.status !== 'PAID') {
          await tx
            .update(loans)
            .set({
              status: 'PAID',
              statusDate: nowDate,
              statusChangedByUserId: userId,
              statusChangedByUserName: userName || userId,
            })
            .where(eq(loans.id, existingLoan.id));

          await tx.insert(loanStatusHistory).values({
            loanId: existingLoan.id,
            fromStatus: existingLoan.status,
            toStatus: 'PAID',
            changedByUserId: userId,
            changedByUserName: userName || userId,
            note: `Credito pagado con abono ${paymentNumber}`.slice(0, 255),
            metadata: {
              loanPaymentId: createdLoanPayment.id,
              accountingDocumentCode,
            },
          });
        }

        const [updatedPayment] = await tx
          .update(loanPayments)
          .set({
            accountingDocumentCode,
          })
          .where(eq(loanPayments.id, createdLoanPayment.id))
          .returning();

        return [updatedPayment];
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

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, existing.loanId),
        columns: {
          id: true,
          creditNumber: true,
          thirdPartyId: true,
          status: true,
        },
      });
      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${existing.loanId} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const originalEntries = await db.query.accountingEntries.findMany({
        where: and(
          eq(accountingEntries.sourceType, 'LOAN_PAYMENT'),
          eq(accountingEntries.sourceId, String(existing.id)),
          inArray(accountingEntries.status, ['DRAFT', 'POSTED'])
        ),
        orderBy: [asc(accountingEntries.sequence)],
      });
      if (!originalEntries.length) {
        throwHttpError({
          status: 400,
          message: 'El abono no tiene movimientos contables para reversar',
          code: 'BAD_REQUEST',
        });
      }

      const originalCreditEntries = originalEntries.filter((entry) => entry.nature === 'CREDIT');
      if (!originalCreditEntries.length) {
        throwHttpError({
          status: 400,
          message: 'Los movimientos del abono no tienen creditos para reversar cartera',
          code: 'BAD_REQUEST',
        });
      }

      const invalidCreditEntry = originalCreditEntries.find(
        (entry) => entry.installmentNumber === null || entry.dueDate === null
      );
      if (invalidCreditEntry) {
        throwHttpError({
          status: 400,
          message: 'Los movimientos del abono no tienen detalle de cuota para reversa',
          code: 'BAD_REQUEST',
        });
      }

      const nowDate = formatDateOnly(new Date());
      const reversalDocumentCode = buildPaymentVoidDocumentCode(existing.id);
      const processType = originalEntries[0].processType;

      let sequence = 1;
      const reversalEntries: Array<typeof accountingEntries.$inferInsert> = originalEntries.map(
        (entry) => {
          const reversalNature = entry.nature === 'DEBIT' ? 'CREDIT' : 'DEBIT';
          const description = `Reversa abono ${existing.paymentNumber}`.slice(0, 255);
          const payload: typeof accountingEntries.$inferInsert = {
            processType,
            documentCode: reversalDocumentCode,
            sequence,
            entryDate: nowDate,
            glAccountId: entry.glAccountId,
            costCenterId: entry.costCenterId,
            thirdPartyId: entry.thirdPartyId ?? existingLoan.thirdPartyId,
            description,
            nature: reversalNature,
            amount: entry.amount,
            loanId: entry.loanId,
            installmentNumber: entry.installmentNumber,
            dueDate: entry.dueDate,
            status: 'DRAFT',
            statusDate: nowDate,
            sourceType: 'LOAN_PAYMENT_VOID',
            sourceId: String(existing.id),
            reversalOfEntryId: entry.id,
          };
          sequence += 1;
          return payload;
        }
      );

      const rollbackDeltas = originalCreditEntries.map((entry) => ({
        glAccountId: entry.glAccountId,
        thirdPartyId: entry.thirdPartyId ?? existingLoan.thirdPartyId,
        loanId: entry.loanId ?? existingLoan.id,
        installmentNumber: entry.installmentNumber ?? 0,
        dueDate: entry.dueDate ?? nowDate,
        chargeDelta: 0,
        paymentDelta: -toNumber(entry.amount),
      }));

      const [updated] = await db.transaction(async (tx) => {
        await tx.insert(accountingEntries).values(reversalEntries);

        await tx
          .update(accountingEntries)
          .set({
            status: 'VOIDED',
            statusDate: nowDate,
          })
          .where(
            inArray(
              accountingEntries.id,
              originalEntries.map((item) => item.id)
            )
          );

        await applyPortfolioDeltas(tx, {
          movementDate: nowDate,
          deltas: rollbackDeltas,
        });

        const [voidedPayment] = await tx
          .update(loanPayments)
          .set({
            status: 'VOID',
            statusDate: nowDate,
            noteStatus: body.noteStatus.trim(),
            updatedByUserId: userId,
            updatedByUserName: userName,
            accountingDocumentCode: reversalDocumentCode,
          })
          .where(eq(loanPayments.id, id))
          .returning();

        const latestPaidPayment = await tx.query.loanPayments.findFirst({
          where: and(eq(loanPayments.loanId, existing.loanId), eq(loanPayments.status, 'PAID')),
          orderBy: [desc(loanPayments.paymentDate), desc(loanPayments.id)],
          columns: {
            paymentDate: true,
          },
        });

        await tx
          .update(loans)
          .set({
            lastPaymentDate: latestPaidPayment?.paymentDate ?? null,
          })
          .where(eq(loans.id, existingLoan.id));

        const remaining = await tx
          .select({
            balance: sql<string>`coalesce(sum(${portfolioEntries.balance}), 0)`,
          })
          .from(portfolioEntries)
          .where(
            and(
              eq(portfolioEntries.loanId, existingLoan.id),
              eq(portfolioEntries.status, 'OPEN'),
              sql`${portfolioEntries.balance} > 0`
            )
          );
        const remainingBalance = roundMoney(toNumber(remaining[0]?.balance ?? '0'));

        if (existingLoan.status === 'PAID' && remainingBalance > 0.01) {
          await tx
            .update(loans)
            .set({
              status: 'ACTIVE',
              statusDate: nowDate,
              statusChangedByUserId: userId,
              statusChangedByUserName: userName || userId,
            })
            .where(eq(loans.id, existingLoan.id));

          await tx.insert(loanStatusHistory).values({
            loanId: existingLoan.id,
            fromStatus: 'PAID',
            toStatus: 'ACTIVE',
            changedByUserId: userId,
            changedByUserName: userName || userId,
            note: `Reversa de abono ${existing.paymentNumber}`.slice(0, 255),
            metadata: {
              loanPaymentId: existing.id,
              reversalAccountingDocumentCode: reversalDocumentCode,
            },
          });
        }

        return [voidedPayment];
      });

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
        metadata: {
          reversalAccountingDocumentCode: reversalDocumentCode,
          reversedEntries: originalEntries.length,
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
