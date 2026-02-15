import {
  CloseCausationPeriodBodySchema,
  ProcessCausationCurrentInsuranceBodySchema,
  ProcessCausationCurrentInterestBodySchema,
  ProcessCausationLateInterestBodySchema,
} from '@/schemas/causation';
import { accountingPeriods, db } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { roundMoney } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { differenceInCalendarDays, format } from 'date-fns';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { contract } from '../contracts';

type ProcessCurrentInterestBody = z.infer<typeof ProcessCausationCurrentInterestBodySchema>;
type ProcessLateInterestBody = z.infer<typeof ProcessCausationLateInterestBodySchema>;
type ProcessCurrentInsuranceBody = z.infer<typeof ProcessCausationCurrentInsuranceBodySchema>;
type ClosePeriodBody = z.infer<typeof CloseCausationPeriodBodySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

function toDateOnly(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function buildCausationSummary(startDate: Date, endDate: Date, baseCredits: number, baseAmount: number) {
  const spanDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const reviewedCredits = Math.max(10, baseCredits + spanDays * 5);
  const accruedCredits = Math.max(0, Math.floor(reviewedCredits * 0.82));
  const totalAccruedAmount = roundMoney(accruedCredits * baseAmount);

  return {
    reviewedCredits,
    accruedCredits,
    totalAccruedAmount,
  };
}

async function processCurrentInterest(body: ProcessCurrentInterestBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const summary = buildCausationSummary(body.startDate, body.endDate, 32, 14_500);

    // TODO(causation-current-interest): implementar causacion real de interes corriente:
    // - calcular interes corriente por credito en el rango de fechas
    // - registrar movimientos de causacion por fecha de transaccion
    // - persistir lote de ejecucion para trazabilidad y reproceso controlado
    return {
      status: 200 as const,
      body: {
        processType: 'CURRENT_INTEREST' as const,
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
        ...summary,
        message: 'Causacion de interes corriente recibida. Pendiente implementacion.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar causacion de interes corriente',
    });
  }
}

async function processLateInterest(body: ProcessLateInterestBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const summary = buildCausationSummary(body.startDate, body.endDate, 18, 8_900);

    // TODO(causation-late-interest): implementar causacion real de interes de mora:
    // - identificar creditos en mora y regla aplicable por producto/categoria
    // - calcular valor de mora por fecha de transaccion
    // - persistir lote de ejecucion para trazabilidad y reproceso controlado
    return {
      status: 200 as const,
      body: {
        processType: 'LATE_INTEREST' as const,
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
        ...summary,
        message: 'Causacion de interes de mora recibida. Pendiente implementacion.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar causacion de interes de mora',
    });
  }
}

async function processCurrentInsurance(body: ProcessCurrentInsuranceBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const summary = buildCausationSummary(body.startDate, body.endDate, 24, 5_200);

    // TODO(causation-current-insurance): implementar causacion real de seguro:
    // - calcular prima/seguro segun producto y cobertura de cada credito
    // - registrar movimiento de causacion por fecha de transaccion
    // - persistir lote de ejecucion para trazabilidad y reproceso controlado
    return {
      status: 200 as const,
      body: {
        processType: 'CURRENT_INSURANCE' as const,
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
        ...summary,
        message: 'Causacion de seguro recibida. Pendiente implementacion.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar causacion de seguro',
    });
  }
}

async function closePeriod(body: ClosePeriodBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const period = await db.query.accountingPeriods.findFirst({
      where: and(eq(accountingPeriods.id, body.accountingPeriodId), eq(accountingPeriods.isClosed, false)),
    });

    if (!period) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Periodo contable abierto no encontrado',
      });
    }

    const periodLabel = `${period.year}-${String(period.month).padStart(2, '0')}`;

    // TODO(causation-period-closing): implementar cierre real del periodo:
    // - validar que no exista cierre previo para el periodo
    // - insertar snapshots de cartera/provision/causacion del periodo
    // - marcar periodo como cerrado y registrar trazabilidad del cierre
    return {
      status: 200 as const,
      body: {
        accountingPeriodId: period.id,
        periodLabel,
        closedAt: toDateOnly(new Date()),
        insertedAgingSnapshots: 125,
        insertedProvisionSnapshots: 125,
        insertedAccrualSnapshots: 125,
        message: 'Cierre de periodo recibido. Pendiente implementacion.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al cerrar periodo de causacion',
    });
  }
}

export const causation = tsr.router(contract.causation, {
  processCurrentInterest: ({ body }, context) => processCurrentInterest(body, context),
  processLateInterest: ({ body }, context) => processLateInterest(body, context),
  processCurrentInsurance: ({ body }, context) => processCurrentInsurance(body, context),
  closePeriod: ({ body }, context) => closePeriod(body, context),
});
