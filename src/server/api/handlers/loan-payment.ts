import {
  accountingEntries,
  agreements,
  db,
  loanPayments,
  loanStatusHistory,
  loans,
  portfolioEntries,
  userPaymentReceiptTypes,
} from '@/server/db';
import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import {
  buildPaymentVoidDocumentCode,
} from '@/server/utils/accounting-utils';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import { createLoanPaymentTx } from '@/server/utils/loan-payment-create';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
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

function normalizeDocumentNumber(value: string): string {
  return value.trim().replace(/[^\dA-Za-z]/g, '').toUpperCase();
}

function normalizeCreditNumber(value: string): string {
  return value.trim().toUpperCase();
}

function extractUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
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
      const created = await db.transaction((tx) =>
        createLoanPaymentTx(tx, {
          userId,
          userName,
          receiptTypeId: body.receiptTypeId,
          paymentDate: body.paymentDate,
          loanId: body.loanId,
          description: body.description,
          amount: body.amount,
          glAccountId: body.glAccountId,
          overpaidAmount: body.overpaidAmount,
          note: body.note,
          loanPaymentMethodAllocations: body.loanPaymentMethodAllocations,
        })
      );

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

  processPayroll: async ({ body }, { request, appRoute, nextRequest }) => {
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

      const rowsToProcess = body.rows.filter(
        (row) => roundMoney(row.paymentAmount + row.overpaidAmount) > 0
      );
      if (!rowsToProcess.length) {
        throwHttpError({
          status: 400,
          message: 'Debe registrar al menos una fila con valor a pagar',
          code: 'BAD_REQUEST',
        });
      }

      const totalPaymentAmount = roundMoney(
        rowsToProcess.reduce((acc, row) => acc + row.paymentAmount, 0)
      );
      const totalOverpaidAmount = roundMoney(
        rowsToProcess.reduce((acc, row) => acc + row.overpaidAmount, 0)
      );
      const totalAssigned = roundMoney(totalPaymentAmount + totalOverpaidAmount);
      const expectedCollectionAmount = roundMoney(body.collectionAmount);

      if (Math.abs(totalAssigned - expectedCollectionAmount) > 0.01) {
        throwHttpError({
          status: 400,
          message: 'La suma de filas debe ser igual al valor del recaudo',
          code: 'BAD_REQUEST',
        });
      }

      const payrollReceiptType = await db.query.userPaymentReceiptTypes.findFirst({
        where: and(
          eq(userPaymentReceiptTypes.userId, userId),
          eq(userPaymentReceiptTypes.paymentReceiptTypeId, body.receiptTypeId)
        ),
        with: {
          paymentReceiptType: {
            columns: {
              movementType: true,
              isActive: true,
            },
          },
        },
      });

      if (!payrollReceiptType?.paymentReceiptType || !payrollReceiptType.paymentReceiptType.isActive) {
        throwHttpError({
          status: 400,
          message: 'El tipo de recibo seleccionado no esta habilitado para el usuario actual',
          code: 'BAD_REQUEST',
        });
      }

      if (payrollReceiptType.paymentReceiptType.movementType !== 'PAYROLL') {
        throwHttpError({
          status: 400,
          message: 'El tipo de recibo seleccionado no corresponde a libranza',
          code: 'BAD_REQUEST',
        });
      }

      if (body.agreementId) {
        const agreement = await db.query.agreements.findFirst({
          where: eq(agreements.id, body.agreementId),
          columns: { id: true },
        });

        if (!agreement) {
          throwHttpError({
            status: 404,
            message: `Convenio con ID ${body.agreementId} no encontrado`,
            code: 'NOT_FOUND',
          });
        }
      }

      const normalizedCompanyDocument = body.companyDocumentNumber?.trim()
        ? normalizeDocumentNumber(body.companyDocumentNumber)
        : '';

      const loanIds = [...new Set(rowsToProcess.map((row) => row.loanId))];
      const loanRows = await db.query.loans.findMany({
        where: inArray(loans.id, loanIds),
        columns: {
          id: true,
          creditNumber: true,
          agreementId: true,
          status: true,
        },
        with: {
          borrower: {
            columns: {
              employerDocumentNumber: true,
            },
          },
        },
      });
      const loanMap = new Map(loanRows.map((item) => [item.id, item]));

      for (const row of rowsToProcess) {
        const loanItem = loanMap.get(row.loanId);
        if (!loanItem) {
          throwHttpError({
            status: 404,
            message: `Credito con ID ${row.loanId} no encontrado`,
            code: 'NOT_FOUND',
          });
        }

        if (loanItem.creditNumber.trim().toUpperCase() !== row.creditNumber.trim().toUpperCase()) {
          throwHttpError({
            status: 400,
            message: `La fila del credito ${row.creditNumber} no coincide con el ID ${row.loanId}`,
            code: 'BAD_REQUEST',
          });
        }

        if (body.agreementId && loanItem.agreementId !== body.agreementId) {
          throwHttpError({
            status: 400,
            message: `El credito ${row.creditNumber} no pertenece al convenio seleccionado`,
            code: 'BAD_REQUEST',
          });
        }

        if (normalizedCompanyDocument) {
          const employerDocument = normalizeDocumentNumber(
            loanItem.borrower?.employerDocumentNumber ?? ''
          );
          if (!employerDocument || employerDocument !== normalizedCompanyDocument) {
            throwHttpError({
              status: 400,
              message: `El credito ${row.creditNumber} no pertenece al documento empresa indicado`,
              code: 'BAD_REQUEST',
            });
          }
        }

        if (!['ACTIVE', 'ACCOUNTED'].includes(loanItem.status)) {
          throwHttpError({
            status: 400,
            message: `El credito ${row.creditNumber} no esta activo para registrar abonos`,
            code: 'BAD_REQUEST',
          });
        }
      }

      const createdPayments = await db.transaction(async (tx) => {
        const created: Array<typeof loanPayments.$inferSelect> = [];

        for (const row of rowsToProcess) {
          const rowTotal = roundMoney(row.paymentAmount + row.overpaidAmount);
          const payment = await createLoanPaymentTx(tx, {
            userId,
            userName,
            receiptTypeId: body.receiptTypeId,
            paymentDate: body.collectionDate,
            loanId: row.loanId,
            description: `Abono por libranza ref ${body.referenceNumber} credito ${row.creditNumber}`.slice(
              0,
              1000
            ),
            amount: row.paymentAmount,
            glAccountId: body.glAccountId,
            overpaidAmount: row.overpaidAmount,
            note: `Lote libranza referencia ${body.referenceNumber}`.slice(0, 1000),
            payrollReferenceNumber: body.referenceNumber,
            payrollPayerDocumentNumber: body.companyDocumentNumber?.trim() || null,
            loanPaymentMethodAllocations: [
              {
                collectionMethodId: body.collectionMethodId,
                tenderReference: body.referenceNumber,
                amount: rowTotal,
              },
            ],
          });
          created.push(payment);
        }

        return created;
      });

      const responseBody = {
        agreementId: body.agreementId ?? null,
        companyDocumentNumber: body.companyDocumentNumber?.trim() || null,
        receiptTypeId: body.receiptTypeId,
        collectionAmount: body.collectionAmount,
        receivedRows: body.rows.length,
        processedRows: createdPayments.length,
        totalPaymentAmount,
        totalOverpaidAmount,
        message: `Lote de libranza procesado. Se registraron ${createdPayments.length} abonos.`,
      };

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'processPayroll',
        status: 'success',
        metadata: {
          ...responseBody,
          rowsToProcess: rowsToProcess.length,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: responseBody,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al procesar abono por libranza',
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'processPayroll',
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

  processFile: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    const totalPaymentAmount = roundMoney(
      body.records.reduce((acc, row) => acc + row.paymentAmount, 0)
    );

    const buildFailureResponse = (
      message: string,
      errors: Array<{
        rowNumber: number | null;
        creditNumber: string | null;
        documentNumber: string | null;
        reason: string;
      }>
    ) => ({
      fileName: body.fileName,
      processed: false,
      receivedRecords: body.records.length,
      totalPaymentAmount,
      processedRecords: 0,
      failedRecords: body.records.length,
      message,
      errors,
    });

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
      const normalizedRows = body.records.map((row) => ({
        ...row,
        normalizedCreditNumber: normalizeCreditNumber(row.creditNumber),
        normalizedDocumentNumber: normalizeDocumentNumber(row.documentNumber),
      }));
      const creditOccurrences = normalizedRows.reduce<Map<string, number>>((acc, row) => {
        const current = acc.get(row.normalizedCreditNumber) ?? 0;
        acc.set(row.normalizedCreditNumber, current + 1);
        return acc;
      }, new Map());

      const creditNumbers = [...new Set(normalizedRows.map((row) => row.normalizedCreditNumber))].filter(
        Boolean
      );

      const loanRows = creditNumbers.length
        ? await db.query.loans.findMany({
            where: sql`upper(${loans.creditNumber}) in (${sql.join(
              creditNumbers.map((value) => sql`${value}`),
              sql`, `
            )})`,
            columns: {
              id: true,
              creditNumber: true,
              status: true,
            },
            with: {
              borrower: {
                columns: {
                  documentNumber: true,
                },
              },
            },
          })
        : [];

      const loanByCredit = new Map(loanRows.map((loan) => [normalizeCreditNumber(loan.creditNumber), loan]));
      const loanIds = loanRows.map((loan) => loan.id);

      const balancesByLoanId = new Map<number, number>();
      if (loanIds.length) {
        const openBalances = await db
          .select({
            loanId: portfolioEntries.loanId,
            balance: sql<string>`coalesce(sum(${portfolioEntries.balance}), 0)`,
          })
          .from(portfolioEntries)
          .where(
            and(
              inArray(portfolioEntries.loanId, loanIds),
              eq(portfolioEntries.status, 'OPEN'),
              sql`${portfolioEntries.balance} > 0`
            )
          )
          .groupBy(portfolioEntries.loanId);

        openBalances.forEach((row) => {
          balancesByLoanId.set(row.loanId, roundMoney(toNumber(row.balance)));
        });
      }

      const validationErrors: Array<{
        rowNumber: number | null;
        creditNumber: string | null;
        documentNumber: string | null;
        reason: string;
      }> = [];
      const rowsToProcess: Array<(typeof normalizedRows)[number] & { loanId: number }> = [];

      normalizedRows.forEach((row) => {
        if ((creditOccurrences.get(row.normalizedCreditNumber) ?? 0) > 1) {
          validationErrors.push({
            rowNumber: row.rowNumber,
            creditNumber: row.creditNumber,
            documentNumber: row.documentNumber,
            reason: 'El credito esta repetido en el archivo',
          });
          return;
        }

        const loan = loanByCredit.get(row.normalizedCreditNumber);
        if (!loan) {
          validationErrors.push({
            rowNumber: row.rowNumber,
            creditNumber: row.creditNumber,
            documentNumber: row.documentNumber,
            reason: 'Credito no encontrado',
          });
          return;
        }

        if (!['ACTIVE', 'ACCOUNTED'].includes(loan.status)) {
          validationErrors.push({
            rowNumber: row.rowNumber,
            creditNumber: row.creditNumber,
            documentNumber: row.documentNumber,
            reason: 'El credito no esta activo para registrar abonos',
          });
          return;
        }

        const borrowerDocument = normalizeDocumentNumber(loan.borrower?.documentNumber ?? '');
        if (!borrowerDocument || borrowerDocument !== row.normalizedDocumentNumber) {
          validationErrors.push({
            rowNumber: row.rowNumber,
            creditNumber: row.creditNumber,
            documentNumber: row.documentNumber,
            reason: 'El documento no coincide con el titular del credito',
          });
          return;
        }

        const openBalance = balancesByLoanId.get(loan.id) ?? 0;
        if (openBalance <= 0) {
          validationErrors.push({
            rowNumber: row.rowNumber,
            creditNumber: row.creditNumber,
            documentNumber: row.documentNumber,
            reason: 'El credito no tiene saldo pendiente para aplicar',
          });
          return;
        }

        rowsToProcess.push({
          ...row,
          loanId: loan.id,
        });
      });

      if (validationErrors.length) {
        const responseBody = buildFailureResponse(
          'No se proceso el archivo. Revise las filas con error.',
          validationErrors
        );

        await logAudit(session, {
          resourceKey: appRoute.metadata.permissionKey.resourceKey,
          actionKey: appRoute.metadata.permissionKey.actionKey,
          action: 'create',
          functionName: 'processFile',
          status: 'failure',
          errorMessage: responseBody.message,
          metadata: {
            fileName: body.fileName,
            errors: validationErrors,
          },
          ipAddress,
          userAgent,
        });

        return {
          status: 200 as const,
          body: responseBody,
        };
      }

      const createdPayments = await db.transaction(async (tx) => {
        const created: Array<typeof loanPayments.$inferSelect> = [];

        for (const row of rowsToProcess) {
          try {
            const payment = await createLoanPaymentTx(tx, {
              userId,
              userName,
              receiptTypeId: body.receiptTypeId,
              paymentDate: new Date(`${row.paymentDate}T00:00:00`),
              loanId: row.loanId,
              description: `Abono por archivo ${body.fileName} fila ${row.rowNumber} credito ${row.creditNumber}`.slice(
                0,
                1000
              ),
              amount: row.paymentAmount,
              glAccountId: body.glAccountId,
              overpaidAmount: 0,
              note: `Lote archivo ${body.fileName}`.slice(0, 1000),
              loanPaymentMethodAllocations: [
                {
                  collectionMethodId: body.collectionMethodId,
                  tenderReference: body.fileName.slice(0, 50),
                  amount: row.paymentAmount,
                },
              ],
            });
            created.push(payment);
          } catch (error) {
            throw {
              status: 400,
              message: `Fila ${row.rowNumber} (${row.creditNumber}): ${extractUnknownErrorMessage(
                error,
                'No fue posible crear el abono'
              )}`,
              code: 'BAD_REQUEST',
              rowNumber: row.rowNumber,
              creditNumber: row.creditNumber,
              documentNumber: row.documentNumber,
            };
          }
        }

        return created;
      });

      const responseBody = {
        fileName: body.fileName,
        processed: true,
        receivedRecords: body.records.length,
        totalPaymentAmount,
        processedRecords: createdPayments.length,
        failedRecords: 0,
        message: `Archivo procesado correctamente. Se registraron ${createdPayments.length} abonos.`,
        errors: [],
      };

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'processFile',
        status: 'success',
        metadata: {
          ...responseBody,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: responseBody,
      };
    } catch (e) {
      const errorStatus =
        typeof (e as { status?: unknown })?.status === 'number'
          ? (e as { status: number }).status
          : null;
      if (errorStatus === 401 || errorStatus === 403) {
        const error = genericTsRestErrorResponse(e, {
          genericMsg: 'Error al procesar archivo de abonos',
        });

        await logAudit(session, {
          resourceKey: appRoute.metadata.permissionKey.resourceKey,
          actionKey: appRoute.metadata.permissionKey.actionKey,
          action: 'create',
          functionName: 'processFile',
          status: 'failure',
          errorMessage: error.body.message,
          metadata: {
            fileName: body.fileName,
          },
          ipAddress,
          userAgent,
        });

        return error;
      }

      const contextualError = e as {
        rowNumber?: unknown;
        creditNumber?: unknown;
        documentNumber?: unknown;
      };

      const failureBody = buildFailureResponse(
        'No se proceso el archivo. No se registraron abonos.',
        [
          {
            rowNumber: typeof contextualError.rowNumber === 'number' ? contextualError.rowNumber : null,
            creditNumber:
              typeof contextualError.creditNumber === 'string' ? contextualError.creditNumber : null,
            documentNumber:
              typeof contextualError.documentNumber === 'string' ? contextualError.documentNumber : null,
            reason: extractUnknownErrorMessage(e, 'Error inesperado al procesar el archivo'),
          },
        ]
      );

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'processFile',
        status: 'failure',
        errorMessage: failureBody.message,
        metadata: {
          fileName: body.fileName,
          reason: failureBody.errors[0]?.reason,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: failureBody,
      };
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
