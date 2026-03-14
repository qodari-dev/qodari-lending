import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { RiskCenterReportType } from '@/schemas/risk-center-report';
import { toast } from 'sonner';

export function useGenerateRiskCenterCifin() {
  return api.riskCenterReport.generateCifin.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGenerateRiskCenterDatacredito() {
  return api.riskCenterReport.generateDatacredito.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useRiskCenterReportRuns(reportType?: RiskCenterReportType) {
  return api.riskCenterReport.listRuns.useQuery({
    queryKey: ['risk-center-report-runs', reportType ?? 'ALL'],
    queryData: {
      query: {
        reportType,
      },
    },
  });
}

export function useRiskCenterReportRunItems(id?: number, enabled = true) {
  return api.riskCenterReport.getRunItems.useQuery({
    queryKey: ['risk-center-report-run-items', id ?? 0],
    queryData: {
      params: {
        id: id ?? 0,
      },
    },
    enabled: enabled && Boolean(id),
  });
}
