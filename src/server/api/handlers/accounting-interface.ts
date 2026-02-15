import {
  ProcessAccountingInterfaceCreditsBodySchema,
  ProcessAccountingInterfaceCurrentInterestBodySchema,
  ProcessAccountingInterfaceLateInterestBodySchema,
  ProcessAccountingInterfacePaymentsBodySchema,
  ProcessAccountingInterfaceWriteOffBodySchema,
  ProcessAccountingInterfaceProvisionBodySchema,
} from '@/schemas/accounting-interface';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
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

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function processCredits(body: ProcessCreditsBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(accounting-interface-credits): implementar interface contable de creditos
    // - consultar creditos desembolsados/liquidados en el rango
    // - construir comprobante segun reglas contables
    // - integrar y registrar trazabilidad del lote
    return {
      status: 200 as const,
      body: {
        interfaceType: 'CREDITS' as const,
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
        processedRecords: 0,
        message: 'Interfaz contable de Creditos recibida. Pendiente implementacion.',
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
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
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
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
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
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
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
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
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
        periodStartDate: toDateOnly(body.startDate),
        periodEndDate: toDateOnly(body.endDate),
        transactionDate: toDateOnly(body.transactionDate),
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
