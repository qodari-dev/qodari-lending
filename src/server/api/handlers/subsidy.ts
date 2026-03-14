import {
  GenerateNotPerformedPledgesReportBodySchema,
  GetSubsidyPledgePaymentVoucherParamsSchema,
  GeneratePerformedPledgesReportBodySchema,
  ListSubsidyPledgePaymentVouchersQuerySchema,
  GeneratePledgePaymentVoucherBodySchema,
} from '@/schemas/subsidy';
import {
  enqueueSubsidyPledgePaymentVoucher,
  getSubsidyPledgePaymentVoucherById,
  listSubsidyPledgePaymentVouchers,
} from '@/server/services/subsidy/subsidy-pledge-payment-voucher-service';
import {
  buildNotPerformedPledgesReport,
  buildPerformedPledgesReport,
} from '@/server/services/subsidy/subsidy-pledges-report-service';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { normalizeUpperCase } from '@/server/utils/string-utils';
import { tsr } from '@ts-rest/serverless/next';
import { z } from 'zod';
import { contract } from '../contracts';
import { enqueueSubsidyPledgePaymentVoucherJob } from '@/server/queues/subsidy-pledge-payment-voucher';

type GeneratePledgePaymentVoucherBody = z.infer<typeof GeneratePledgePaymentVoucherBodySchema>;
type GeneratePerformedPledgesReportBody = z.infer<typeof GeneratePerformedPledgesReportBodySchema>;
type GenerateNotPerformedPledgesReportBody = z.infer<
  typeof GenerateNotPerformedPledgesReportBodySchema
>;
type ListSubsidyPledgePaymentVouchersQuery = z.infer<
  typeof ListSubsidyPledgePaymentVouchersQuerySchema
>;
type GetSubsidyPledgePaymentVoucherParams = z.infer<typeof GetSubsidyPledgePaymentVoucherParamsSchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

async function generatePledgePaymentVoucher(
  body: GeneratePledgePaymentVoucherBody,
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
    const voucher = await enqueueSubsidyPledgePaymentVoucher({
      period: body.period,
      movementGenerationDate: body.movementGenerationDate,
      userId,
      userName,
    });

    await enqueueSubsidyPledgePaymentVoucherJob({ voucherId: voucher.id });

    return {
      status: 200 as const,
      body: await getSubsidyPledgePaymentVoucherById(voucher.id),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar comprobante de abonos de pignoracion',
    });
  }
}

async function listPledgePaymentVouchers(
  query: ListSubsidyPledgePaymentVouchersQuery,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    return {
      status: 200 as const,
      body: await listSubsidyPledgePaymentVouchers(query.limit ?? 10),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al listar lotes de pignoracion de subsidio',
    });
  }
}

async function getPledgePaymentVoucher(
  params: GetSubsidyPledgePaymentVoucherParams,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    return {
      status: 200 as const,
      body: await getSubsidyPledgePaymentVoucherById(params.id),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: `Error al obtener lote de pignoracion ${params.id}`,
    });
  }
}

async function generatePerformedPledgesReport(
  body: GeneratePerformedPledgesReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const period = normalizeUpperCase(body.period);
    return {
      status: 200 as const,
      body: await buildPerformedPledgesReport(period),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de pignoraciones realizadas',
    });
  }
}

async function generateNotPerformedPledgesReport(
  body: GenerateNotPerformedPledgesReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const period = normalizeUpperCase(body.period);
    return {
      status: 200 as const,
      body: await buildNotPerformedPledgesReport(period),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de pignoraciones no realizadas',
    });
  }
}

export const subsidy = tsr.router(contract.subsidy, {
  listPledgePaymentVouchers: ({ query }, context) => listPledgePaymentVouchers(query, context),
  getPledgePaymentVoucher: ({ params }, context) => getPledgePaymentVoucher(params, context),
  generatePledgePaymentVoucher: ({ body }, context) => generatePledgePaymentVoucher(body, context),
  generatePerformedPledgesReport: ({ body }, context) => generatePerformedPledgesReport(body, context),
  generateNotPerformedPledgesReport: ({ body }, context) =>
    generateNotPerformedPledgesReport(body, context),
});
