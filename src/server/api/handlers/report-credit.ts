import { contract } from '@/server/api/contracts';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getCreditExtractReportData } from '@/server/utils/report-credit';
import { tsr } from '@ts-rest/serverless/next';

export const reportCredit = tsr.router(contract.reportCredit, {
  getExtract: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);
      const report = await getCreditExtractReportData(query.creditNumber);

      return {
        status: 200 as const,
        body: report,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar extracto de credito',
      });
    }
  },
});
