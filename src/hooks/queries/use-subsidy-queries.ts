import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

export function useGeneratePledgePaymentVoucher() {
  return api.subsidy.generatePledgePaymentVoucher.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGeneratePerformedPledgesReport() {
  return api.subsidy.generatePerformedPledgesReport.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGenerateNotPerformedPledgesReport() {
  return api.subsidy.generateNotPerformedPledgesReport.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}
