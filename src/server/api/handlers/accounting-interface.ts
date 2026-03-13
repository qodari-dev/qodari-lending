import {
  ProcessAccountingInterfaceCreditsBodySchema,
  ProcessAccountingInterfaceCurrentInterestBodySchema,
  ProcessAccountingInterfaceLateInterestBodySchema,
  ProcessAccountingInterfacePaymentsBodySchema,
  ProcessAccountingInterfaceWriteOffBodySchema,
  ProcessAccountingInterfaceProvisionBodySchema,
} from '@/schemas/accounting-interface';
import {
  accountingEntries,
  db,
  loanInstallments,
  loans,
  loanStatusHistory,
} from '@/server/db';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { formatDateOnly } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, between, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { contract } from '../contracts';

type ProcessCreditsBody = z.infer<typeof ProcessAccountingInterfaceCreditsBodySchema>;
type ProcessCurrentInterestBody = z.infer<typeof ProcessAccountingInterfaceCurrentInterestBodySchema>;
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
            status: 'POSTED',
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

async function processCurrentInterest(body: ProcessCurrentInterestBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(accounting-interface-current-interest): implementar interface contable de interes corriente
    // - consultar causacion de interes corriente en el rango
    // - construir comprobante segun reglas contables
    // - integrar y registrar trazabilidad del lote
    return {
      status: 200 as const,
      body: {
        interfaceType: 'CURRENT_INTEREST' as const,
        periodStartDate: formatDateOnly(body.startDate),
        periodEndDate: formatDateOnly(body.endDate),
        transactionDate: formatDateOnly(body.transactionDate),
        processedRecords: 0,
        message: 'Interfaz contable de Interes corriente recibida. Pendiente implementacion.',
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

    // TODO(accounting-interface-late-interest): implementar interface contable de interes mora
    // - consultar causacion de interes mora en el rango
    // - construir comprobante segun reglas contables
    // - integrar y registrar trazabilidad del lote
    return {
      status: 200 as const,
      body: {
        interfaceType: 'LATE_INTEREST' as const,
        periodStartDate: formatDateOnly(body.startDate),
        periodEndDate: formatDateOnly(body.endDate),
        transactionDate: formatDateOnly(body.transactionDate),
        processedRecords: 0,
        message: 'Interfaz contable de Interes mora recibida. Pendiente implementacion.',
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

    // TODO(accounting-interface-payments): implementar interface contable de abonos
    // - consultar abonos aplicados en el rango
    // - construir comprobante segun reglas contables
    // - integrar y registrar trazabilidad del lote
    return {
      status: 200 as const,
      body: {
        interfaceType: 'PAYMENTS' as const,
        periodStartDate: formatDateOnly(body.startDate),
        periodEndDate: formatDateOnly(body.endDate),
        transactionDate: formatDateOnly(body.transactionDate),
        processedRecords: 0,
        message: 'Interfaz contable de Abonos recibida. Pendiente implementacion.',
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
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(accounting-interface-provision): implementar interface contable de provision
    // - consultar provisiones del rango
    // - construir comprobante segun reglas contables
    // - integrar y registrar trazabilidad del lote
    return {
      status: 200 as const,
      body: {
        interfaceType: 'PROVISION' as const,
        periodStartDate: formatDateOnly(body.startDate),
        periodEndDate: formatDateOnly(body.endDate),
        transactionDate: formatDateOnly(body.transactionDate),
        processedRecords: 0,
        message: 'Interfaz contable de Provision recibida. Pendiente implementacion.',
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
  processCurrentInterest: ({ body }, context) => processCurrentInterest(body, context),
  processLateInterest: ({ body }, context) => processLateInterest(body, context),
  processPayments: ({ body }, context) => processPayments(body, context),
  processWriteOff: ({ body }, context) => processWriteOff(body, context),
  processProvision: ({ body }, context) => processProvision(body, context),
});
