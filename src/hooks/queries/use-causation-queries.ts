import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

export function useProcessCausationCurrentInterest() {
  return api.causation.processCurrentInterest.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useProcessCausationLateInterest() {
  return api.causation.processLateInterest.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useProcessCausationCurrentInsurance() {
  return api.causation.processCurrentInsurance.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useCloseCausationPeriod() {
  return api.causation.closePeriod.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}
