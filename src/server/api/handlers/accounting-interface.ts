import {
  ProcessAccountingInterfaceCreditsBodySchema,
  ProcessAccountingInterfaceCurrentInterestBodySchema,
  ProcessAccountingInterfaceDisbursementAdjustmentsBodySchema,
  ProcessAccountingInterfaceLateInterestBodySchema,
  ProcessAccountingInterfacePaymentsBodySchema,
  ProcessAccountingInterfaceWriteOffBodySchema,
  ProcessAccountingInterfaceProvisionBodySchema,
} from '@/schemas/accounting-interface';
import {
  accountingEntries,
  creditsSettings,
  db,
  loanInstallments,
  loanDisbursementEvents,
  loanPayments,
  loans,
  loanStatusHistory,
  portfolioProvisionSnapshots,
} from '@/server/db';
import { env } from '@/env';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { recordLoanDisbursementEvent } from '@/server/utils/loan-disbursement-events';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, between, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { contract } from '../contracts';

type ProcessCreditsBody = z.infer<typeof ProcessAccountingInterfaceCreditsBodySchema>;
type ProcessCurrentInterestBody = z.infer<typeof ProcessAccountingInterfaceCurrentInterestBodySchema>;
type ProcessDisbursementAdjustmentsBody = z.infer<
  typeof ProcessAccountingInterfaceDisbursementAdjustmentsBodySchema
>;
type ProcessLateInterestBody = z.infer<typeof ProcessAccountingInterfaceLateInterestBodySchema>;
type ProcessPaymentsBody = z.infer<typeof ProcessAccountingInterfacePaymentsBodySchema>;
type ProcessWriteOffBody = z.infer<typeof ProcessAccountingInterfaceWriteOffBodySchema>;
type ProcessProvisionBody = z.infer<typeof ProcessAccountingInterfaceProvisionBodySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

const PAYMENT_INTERFACE_PROCESS_TYPES = [
  'RECEIPT',
  'PLEDGE',
  'PAYROLL',
  'DEPOSIT',
  'OTHER',
] as const;

function buildProvisionSnapshotDocumentCode(snapshotId: number): string {
  return `PROV${String(snapshotId).padStart(6, '0')}`;
}

function buildMonthKey(date: Date): number {
  return date.getFullYear() * 100 + (date.getMonth() + 1);
}

async function processCredits(body: ProcessCreditsBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const { userId, userName } = getRequiredUserContext(session!);

    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);
    const transactionDate = formatDateOnly(body.transactionDate);

    const draftCreditEntries = await db.query.accountingEntries.findMany({
      where: and(
        eq(accountingEntries.processType, 'CREDIT'),
        eq(accountingEntries.status, 'DRAFT'),
        between(accountingEntries.entryDate, startDate, endDate)
      ),
      columns: {
        id: true,
        loanId: true,
      },
    });

    const loanIds = [...new Set(draftCreditEntries.map((item) => item.loanId).filter((value): value is number => !!value))];

    if (loanIds.length) {
      await db.transaction(async (tx) => {
        await tx
          .update(accountingEntries)
          .set({
            status: 'ACCOUNTED',
            statusDate: transactionDate,
          })
          .where(
            and(
              eq(accountingEntries.processType, 'CREDIT'),
              eq(accountingEntries.status, 'DRAFT'),
              between(accountingEntries.entryDate, startDate, endDate),
              inArray(accountingEntries.loanId, loanIds)
            )
          );

        await tx
          .update(loanInstallments)
          .set({ status: 'ACCOUNTED' })
          .where(
            and(
              inArray(loanInstallments.loanId, loanIds),
              eq(loanInstallments.status, 'GENERATED')
            )
          );

        const loansToAccount = await tx.query.loans.findMany({
          where: and(inArray(loans.id, loanIds), eq(loans.status, 'GENERATED')),
          columns: {
            id: true,
            status: true,
            disbursementStatus: true,
            firstCollectionDate: true,
            maturityDate: true,
          },
        });

        if (loansToAccount.length) {
          await tx
            .update(loans)
            .set({
              status: 'ACCOUNTED',
              statusDate: transactionDate,
              disbursementStatus: 'SENT_TO_ACCOUNTING',
              statusChangedByUserId: userId,
              statusChangedByUserName: userName || userId,
            })
            .where(
              and(
                inArray(
                  loans.id,
                  loansToAccount.map((item) => item.id)
                ),
                eq(loans.status, 'GENERATED')
              )
            );

          await tx.insert(loanStatusHistory).values(
            loansToAccount.map((loan) => ({
              loanId: loan.id,
              fromStatus: loan.status,
              toStatus: 'ACCOUNTED' as const,
              changedByUserId: userId,
              changedByUserName: userName || userId,
              note: 'Credito enviado y contabilizado en interfaz contable',
              metadata: {
                interfaceType: 'CREDITS',
                transactionDate,
              },
            }))
          );

          await Promise.all(
            loansToAccount.map((loan) =>
              recordLoanDisbursementEvent(tx, {
                loanId: loan.id,
                eventType: 'SENT_TO_ACCOUNTING',
                eventDate: transactionDate,
                fromDisbursementStatus: loan.disbursementStatus,
                toDisbursementStatus: 'SENT_TO_ACCOUNTING',
                previousFirstCollectionDate: loan.firstCollectionDate,
                newFirstCollectionDate: loan.firstCollectionDate,
                previousMaturityDate: loan.maturityDate,
                newMaturityDate: loan.maturityDate,
                changedByUserId: userId,
                changedByUserName: userName || userId,
                note: 'Crédito contabilizado y enviado a contabilidad',
                metadata: {
                  interfaceType: 'CREDITS',
                  transactionDate,
                },
              })
            )
          );
        }
      });
    }

    return {
      status: 200 as const,
      body: {
        interfaceType: 'CREDITS' as const,
        periodStartDate: startDate,
        periodEndDate: endDate,
        transactionDate,
        processedRecords: loanIds.length,
        message: loanIds.length
          ? `Interfaz contable de Creditos procesada. Se contabilizaron ${loanIds.length} creditos.`
          : 'No se encontraron creditos pendientes por contabilizar en el rango seleccionado.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar interfaz contable de Creditos',
    });
  }
}

async function processDisbursementAdjustments(
  body: ProcessDisbursementAdjustmentsBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const { userId, userName } = getRequiredUserContext(session!);

    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);
    const transactionDate = formatDateOnly(body.transactionDate);

    const adjustmentEvents = await db.query.loanDisbursementEvents.findMany({
      where: and(
        eq(loanDisbursementEvents.eventType, 'DATES_UPDATED'),
        between(loanDisbursementEvents.eventDate, startDate, endDate)
      ),
      columns: {
        loanId: true,
      },
    });

    const loanIds = [...new Set(adjustmentEvents.map((item) => item.loanId))];
    let processedRecords = 0;

    if (loanIds.length) {
      await db.transaction(async (tx) => {
        const loansToProcess = await tx.query.loans.findMany({
          where: and(
            inArray(loans.id, loanIds),
            eq(loans.status, 'ACCOUNTED'),
            eq(loans.disbursementStatus, 'DISBURSED'),
            eq(loans.hasPendingDisbursementAdjustment, true)
          ),
          columns: {
            id: true,
            disbursementStatus: true,
            firstCollectionDate: true,
            maturityDate: true,
          },
        });

        if (!loansToProcess.length) {
          return;
        }

        processedRecords = loansToProcess.length;

        await tx
          .update(accountingEntries)
          .set({
            status: 'ACCOUNTED',
            statusDate: transactionDate,
          })
          .where(
            and(
              inArray(
                accountingEntries.loanId,
                loansToProcess.map((item) => item.id)
              ),
              eq(accountingEntries.processType, 'CREDIT'),
              eq(accountingEntries.sourceType, 'MANUAL_ADJUSTMENT'),
              eq(accountingEntries.status, 'DRAFT')
            )
          );

        await tx
          .update(loanInstallments)
          .set({
            status: 'ACCOUNTED',
          })
          .where(
            and(
              inArray(
                loanInstallments.loanId,
                loansToProcess.map((item) => item.id)
              ),
              eq(loanInstallments.status, 'GENERATED')
            )
          );

        await tx
          .update(loans)
          .set({
            hasPendingDisbursementAdjustment: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(
                loans.id,
                loansToProcess.map((item) => item.id)
              ),
              eq(loans.hasPendingDisbursementAdjustment, true)
            )
          );

        await Promise.all(
          loansToProcess.map((loan) =>
            recordLoanDisbursementEvent(tx, {
              loanId: loan.id,
              eventType: 'ADJUSTMENT_SENT_TO_ACCOUNTING',
              eventDate: transactionDate,
              fromDisbursementStatus: loan.disbursementStatus,
              toDisbursementStatus: loan.disbursementStatus,
              previousFirstCollectionDate: loan.firstCollectionDate,
              newFirstCollectionDate: loan.firstCollectionDate,
              previousMaturityDate: loan.maturityDate,
              newMaturityDate: loan.maturityDate,
              changedByUserId: userId,
              changedByUserName: userName || userId,
              note: 'Novedad de desembolso enviada a contabilidad',
              metadata: {
                interfaceType: 'DISBURSEMENT_ADJUSTMENTS',
                transactionDate,
                accountedDraftAdjustments: true,
              },
            })
          )
        );
      });
    }

    return {
      status: 200 as const,
      body: {
        interfaceType: 'DISBURSEMENT_ADJUSTMENTS' as const,
        periodStartDate: startDate,
        periodEndDate: endDate,
        transactionDate,
        processedRecords,
        message: processedRecords
          ? `Interfaz contable de novedades de desembolso procesada. Se enviaron ${processedRecords} crédito(s) a contabilidad y se desmarcaron.`
          : 'No se encontraron novedades de desembolso pendientes en el rango seleccionado.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar interfaz contable de novedades de desembolso',
    });
  }
}

async function processCurrentInterest(body: ProcessCurrentInterestBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);
    const transactionDate = formatDateOnly(body.transactionDate);

    const draftInterestEntries = await db.query.accountingEntries.findMany({
      where: and(
        eq(accountingEntries.processType, 'INTEREST'),
        eq(accountingEntries.sourceType, 'PROCESS_RUN'),
        eq(accountingEntries.status, 'DRAFT'),
        between(accountingEntries.entryDate, startDate, endDate)
      ),
      columns: {
        id: true,
        processRunId: true,
      },
    });

    const entryIds = draftInterestEntries.map((item) => item.id);
    const processRunIds = [
      ...new Set(
        draftInterestEntries
          .map((item) => item.processRunId)
          .filter((value): value is number => value !== null && Number.isInteger(value) && value > 0)
      ),
    ];

    if (entryIds.length) {
      await db
        .update(accountingEntries)
        .set({
          status: 'ACCOUNTED',
          statusDate: transactionDate,
        })
        .where(inArray(accountingEntries.id, entryIds));
    }

    return {
      status: 200 as const,
      body: {
        interfaceType: 'CURRENT_INTEREST' as const,
        periodStartDate: startDate,
        periodEndDate: endDate,
        transactionDate,
        processedRecords: processRunIds.length,
        message: processRunIds.length
          ? `Interfaz contable de Interes corriente procesada. Se contabilizaron ${processRunIds.length} corrida(s).`
          : 'No se encontraron causaciones de interes corriente pendientes por contabilizar en el rango seleccionado.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar interfaz contable de Interes corriente',
    });
  }
}

async function processLateInterest(body: ProcessLateInterestBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);
    const transactionDate = formatDateOnly(body.transactionDate);

    const draftLateInterestEntries = await db.query.accountingEntries.findMany({
      where: and(
        eq(accountingEntries.processType, 'LATE_INTEREST'),
        eq(accountingEntries.sourceType, 'PROCESS_RUN'),
        eq(accountingEntries.status, 'DRAFT'),
        between(accountingEntries.entryDate, startDate, endDate)
      ),
      columns: {
        id: true,
        processRunId: true,
      },
    });

    const entryIds = draftLateInterestEntries.map((item) => item.id);
    const processRunIds = [
      ...new Set(
        draftLateInterestEntries
          .map((item) => item.processRunId)
          .filter((value): value is number => value !== null && Number.isInteger(value) && value > 0)
      ),
    ];

    if (entryIds.length) {
      await db
        .update(accountingEntries)
        .set({
          status: 'ACCOUNTED',
          statusDate: transactionDate,
        })
        .where(inArray(accountingEntries.id, entryIds));
    }

    return {
      status: 200 as const,
      body: {
        interfaceType: 'LATE_INTEREST' as const,
        periodStartDate: startDate,
        periodEndDate: endDate,
        transactionDate,
        processedRecords: processRunIds.length,
        message: processRunIds.length
          ? `Interfaz contable de Interes mora procesada. Se contabilizaron ${processRunIds.length} corrida(s).`
          : 'No se encontraron causaciones de interes mora pendientes por contabilizar en el rango seleccionado.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar interfaz contable de Interes mora',
    });
  }
}

async function processPayments(body: ProcessPaymentsBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);
    const transactionDate = formatDateOnly(body.transactionDate);

    const draftPaymentEntries = await db.query.accountingEntries.findMany({
      where: and(
        inArray(accountingEntries.processType, PAYMENT_INTERFACE_PROCESS_TYPES),
        eq(accountingEntries.sourceType, 'LOAN_PAYMENT'),
        eq(accountingEntries.status, 'DRAFT'),
        between(accountingEntries.entryDate, startDate, endDate)
      ),
      columns: {
        id: true,
        sourceId: true,
      },
    });

    const entryIds = draftPaymentEntries.map((item) => item.id);
    const paymentIds = [
      ...new Set(
        draftPaymentEntries
          .map((item) => Number(item.sourceId))
          .filter((value) => Number.isInteger(value) && value > 0)
      ),
    ];

    if (entryIds.length) {
      await db.transaction(async (tx) => {
        await tx
          .update(accountingEntries)
          .set({
            status: 'ACCOUNTED',
            statusDate: transactionDate,
          })
          .where(inArray(accountingEntries.id, entryIds));

        if (paymentIds.length) {
          await tx
            .update(loanPayments)
            .set({
              updatedAt: new Date(),
            })
            .where(inArray(loanPayments.id, paymentIds));
        }
      });
    }

    return {
      status: 200 as const,
      body: {
        interfaceType: 'PAYMENTS' as const,
        periodStartDate: startDate,
        periodEndDate: endDate,
        transactionDate,
        processedRecords: paymentIds.length,
        message: paymentIds.length
          ? `Interfaz contable de Abonos procesada. Se contabilizaron ${paymentIds.length} abono(s).`
          : 'No se encontraron abonos pendientes por contabilizar en el rango seleccionado.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar interfaz contable de Abonos',
    });
  }
}

async function processWriteOff(body: ProcessWriteOffBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(accounting-interface-write-off): implementar interface contable de castiga cartera
    // - consultar creditos castigados en el rango
    // - construir comprobante segun reglas contables
    // - integrar y registrar trazabilidad del lote
    return {
      status: 200 as const,
      body: {
        interfaceType: 'WRITE_OFF' as const,
        periodStartDate: formatDateOnly(body.startDate),
        periodEndDate: formatDateOnly(body.endDate),
        transactionDate: formatDateOnly(body.transactionDate),
        processedRecords: 0,
        message: 'Interfaz contable de Castiga cartera recibida. Pendiente implementacion.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar interfaz contable de Castiga cartera',
    });
  }
}

async function processProvision(body: ProcessProvisionBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const { userId, userName } = getRequiredUserContext(session!);

    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);
    const transactionDate = formatDateOnly(body.transactionDate);
    const startMonthKey = buildMonthKey(body.startDate);
    const endMonthKey = buildMonthKey(body.endDate);

    const settings = await db.query.creditsSettings.findFirst({
      columns: {
        provisionExpenseGlAccountId: true,
        portfolioProvisionGlAccountId: true,
        provisionRecoveryGlAccountId: true,
      },
      where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
    });

    const pendingSnapshots = await db.query.portfolioProvisionSnapshots.findMany({
      where: eq(portfolioProvisionSnapshots.accountingStatus, 'PENDING'),
      columns: {
        id: true,
        deltaToPost: true,
        metadata: true,
      },
      with: {
        accountingPeriod: {
          columns: {
            id: true,
            year: true,
            month: true,
          },
        },
      },
    });

    const snapshotsToProcess = pendingSnapshots.filter((snapshot) => {
      const period = snapshot.accountingPeriod;
      const monthKey = period.year * 100 + period.month;
      return monthKey >= startMonthKey && monthKey <= endMonthKey;
    });

    for (const snapshot of snapshotsToProcess) {
      const delta = roundMoney(toNumber(snapshot.deltaToPost));
      if (delta > 0) {
        if (!settings?.provisionExpenseGlAccountId || !settings.portfolioProvisionGlAccountId) {
          throwHttpError({
            status: 400,
            message:
              'Debe configurar cuenta de gasto de provisión y cuenta de provisión de cartera',
            code: 'BAD_REQUEST',
          });
        }
      } else if (delta < 0) {
        if (!settings?.provisionRecoveryGlAccountId || !settings.portfolioProvisionGlAccountId) {
          throwHttpError({
            status: 400,
            message:
              'Debe configurar cuenta de recuperación de provisión y cuenta de provisión de cartera',
            code: 'BAD_REQUEST',
          });
        }
      }
    }

    if (snapshotsToProcess.length) {
      await db.transaction(async (tx) => {
        for (const snapshot of snapshotsToProcess) {
          const delta = roundMoney(toNumber(snapshot.deltaToPost));
          const direction =
            delta > 0 ? 'INCREASE' : delta < 0 ? 'REVERSAL' : 'NO_MOVEMENT';
          const debitGlAccountId =
            delta > 0
              ? settings?.provisionExpenseGlAccountId ?? null
              : delta < 0
                ? settings?.portfolioProvisionGlAccountId ?? null
                : null;
          const creditGlAccountId =
            delta > 0
              ? settings?.portfolioProvisionGlAccountId ?? null
              : delta < 0
                ? settings?.provisionRecoveryGlAccountId ?? null
                : null;
          const documentCode = buildProvisionSnapshotDocumentCode(snapshot.id);
          const previousMetadata =
            snapshot.metadata && typeof snapshot.metadata === 'object' ? snapshot.metadata : {};

          await tx
            .update(portfolioProvisionSnapshots)
            .set({
              accountingStatus: 'ACCOUNTED',
              accountedAt: new Date(),
              accountedByUserId: userId,
              accountedByUserName: userName || userId,
              accountingDocumentCode: documentCode,
              accountingNote:
                direction === 'NO_MOVEMENT'
                  ? 'Snapshot contabilizado sin delta pendiente'
                  : `Base contable preparada sin inserción automática (${direction})`,
              metadata: {
                ...previousMetadata,
                accountingInterface: {
                  transactionDate,
                  direction,
                  deltaToPost: delta,
                  debitGlAccountId,
                  creditGlAccountId,
                  insertedAccountingEntries: false,
                },
              },
              updatedAt: new Date(),
            })
            .where(eq(portfolioProvisionSnapshots.id, snapshot.id));
        }
      });
    }

    return {
      status: 200 as const,
      body: {
        interfaceType: 'PROVISION' as const,
        periodStartDate: startDate,
        periodEndDate: endDate,
        transactionDate,
        processedRecords: snapshotsToProcess.length,
        message: snapshotsToProcess.length
          ? `Interfaz base de provisión procesada. Se marcaron ${snapshotsToProcess.length} snapshot(s) como contabilizados sin insertar asientos contables.`
          : 'No se encontraron snapshots de provisión pendientes por contabilizar en el rango seleccionado.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar interfaz contable de Provision',
    });
  }
}

export const accountingInterface = tsr.router(contract.accountingInterface, {
  processCredits: ({ body }, context) => processCredits(body, context),
  processDisbursementAdjustments: ({ body }, context) =>
    processDisbursementAdjustments(body, context),
  processCurrentInterest: ({ body }, context) => processCurrentInterest(body, context),
  processLateInterest: ({ body }, context) => processLateInterest(body, context),
  processPayments: ({ body }, context) => processPayments(body, context),
  processWriteOff: ({ body }, context) => processWriteOff(body, context),
  processProvision: ({ body }, context) => processProvision(body, context),
});
