import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
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

