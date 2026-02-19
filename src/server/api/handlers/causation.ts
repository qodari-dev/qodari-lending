import {
  CloseCausationPeriodBodySchema,
  ProcessCausationBillingConceptsBodySchema,
  ProcessCausationCurrentInsuranceBodySchema,
  ProcessCausationCurrentInterestBodySchema,
  ProcessCausationLateInterestBodySchema,
} from '@/schemas/causation';
import {
  createAndQueueBillingConceptsRun,
  getBillingConceptsRunStatus,
} from '@/server/causation/billing-concepts-run-service';
import { closeCausationPeriod } from '@/server/causation/period-closing-service';
import {
  createAndQueueCurrentInsuranceRun,
  getCurrentInsuranceRunStatus,
} from '@/server/causation/current-insurance-run-service';
import {
  createAndQueueCurrentInterestRun,
  getCurrentInterestRunStatus,
} from '@/server/causation/current-interest-run-service';
import {
  createAndQueueLateInterestRun,
  getLateInterestRunStatus,
} from '@/server/causation/late-interest-run-service';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { z } from 'zod';
import { contract } from '../contracts';

type ProcessCurrentInterestBody = z.infer<typeof ProcessCausationCurrentInterestBodySchema>;
type ProcessLateInterestBody = z.infer<typeof ProcessCausationLateInterestBodySchema>;
type ProcessCurrentInsuranceBody = z.infer<typeof ProcessCausationCurrentInsuranceBodySchema>;
type ProcessBillingConceptsBody = z.infer<typeof ProcessCausationBillingConceptsBodySchema>;
type ClosePeriodBody = z.infer<typeof CloseCausationPeriodBodySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

async function processCurrentInterest(
  { body }: { body: ProcessCurrentInterestBody },
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    if (!session) {
      throwHttpError({
        status: 401,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
      });
    }

    const { userId, userName } = getRequiredUserContext(session);
    const run = await createAndQueueCurrentInterestRun({
      processDate: body.processDate,
      transactionDate: body.transactionDate,
      scopeType: body.scopeType,
      creditProductId: body.creditProductId,
      loanId: body.loanId,
      executedByUserId: userId,
      executedByUserName: userName || userId,
      triggerSource: 'MANUAL',
    });

    return {
      status: 200 as const,
      body: {
        processRunId: run.id,
        processType: 'CURRENT_INTEREST' as const,
        status: 'QUEUED' as const,
        message: `Corrida encolada correctamente. Run #${run.id}`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar causacion de interes corriente',
    });
  }
}

async function getCurrentInterestRun({ params }: { params: { id: number } }, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const status = await getCurrentInterestRunStatus(params.id);

    return {
      status: 200 as const,
      body: status,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: `Error al consultar corrida de interes corriente ${params.id}`,
    });
  }
}

async function processLateInterest(
  { body }: { body: ProcessLateInterestBody },
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    if (!session) {
      throwHttpError({
        status: 401,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
      });
    }

    const { userId, userName } = getRequiredUserContext(session);
    const run = await createAndQueueLateInterestRun({
      processDate: body.processDate,
      transactionDate: body.transactionDate,
      scopeType: body.scopeType,
      creditProductId: body.creditProductId,
      loanId: body.loanId,
      executedByUserId: userId,
      executedByUserName: userName || userId,
      triggerSource: 'MANUAL',
    });

    return {
      status: 200 as const,
      body: {
        processRunId: run.id,
        processType: 'LATE_INTEREST' as const,
        status: 'QUEUED' as const,
        message: `Corrida encolada correctamente. Run #${run.id}`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar causacion de interes de mora',
    });
  }
}

async function getLateInterestRun({ params }: { params: { id: number } }, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const status = await getLateInterestRunStatus(params.id);

    return {
      status: 200 as const,
      body: status,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: `Error al consultar corrida de interes mora ${params.id}`,
    });
  }
}

async function processCurrentInsurance(
  { body }: { body: ProcessCurrentInsuranceBody },
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    if (!session) {
      throwHttpError({
        status: 401,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
      });
    }

    const { userId, userName } = getRequiredUserContext(session);
    const run = await createAndQueueCurrentInsuranceRun({
      processDate: body.processDate,
      transactionDate: body.transactionDate,
      scopeType: body.scopeType,
      creditProductId: body.creditProductId,
      loanId: body.loanId,
      executedByUserId: userId,
      executedByUserName: userName || userId,
      triggerSource: 'MANUAL',
    });

    return {
      status: 200 as const,
      body: {
        processRunId: run.id,
        processType: 'CURRENT_INSURANCE' as const,
        status: 'QUEUED' as const,
        message: `Corrida encolada correctamente. Run #${run.id}`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar causacion de seguro',
    });
  }
}

async function getCurrentInsuranceRun(
  { params }: { params: { id: number } },
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const status = await getCurrentInsuranceRunStatus(params.id);

    return {
      status: 200 as const,
      body: status,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: `Error al consultar corrida de seguro ${params.id}`,
    });
  }
}

async function processBillingConcepts(
  { body }: { body: ProcessBillingConceptsBody },
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    if (!session) {
      throwHttpError({
        status: 401,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
      });
    }

    const { userId, userName } = getRequiredUserContext(session);
    const run = await createAndQueueBillingConceptsRun({
      processDate: body.processDate,
      transactionDate: body.transactionDate,
      scopeType: body.scopeType,
      creditProductId: body.creditProductId,
      loanId: body.loanId,
      executedByUserId: userId,
      executedByUserName: userName || userId,
      triggerSource: 'MANUAL',
    });

    return {
      status: 200 as const,
      body: {
        processRunId: run.id,
        processType: 'BILLING_CONCEPTS' as const,
        status: 'QUEUED' as const,
        message: `Corrida encolada correctamente. Run #${run.id}`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al procesar causacion de otros conceptos',
    });
  }
}

async function getBillingConceptsRun({ params }: { params: { id: number } }, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const status = await getBillingConceptsRunStatus(params.id);

    return {
      status: 200 as const,
      body: status,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: `Error al consultar corrida de otros conceptos ${params.id}`,
    });
  }
}

async function closePeriod({ body }: { body: ClosePeriodBody }, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    if (!session) {
      throwHttpError({
        status: 401,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
      });
    }

    const { userId, userName } = getRequiredUserContext(session);
    const result = await closeCausationPeriod({
      accountingPeriodId: body.accountingPeriodId,
      executedByUserId: userId,
      executedByUserName: userName || userId,
    });

    return {
      status: 200 as const,
      body: result,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al cerrar periodo de causacion',
    });
  }
}

export const causation = tsr.router(contract.causation, {
  processCurrentInterest,
  getCurrentInterestRun,
  processLateInterest,
  getLateInterestRun,
  processCurrentInsurance,
  getCurrentInsuranceRun,
  processBillingConcepts,
  getBillingConceptsRun,
  closePeriod,
});
