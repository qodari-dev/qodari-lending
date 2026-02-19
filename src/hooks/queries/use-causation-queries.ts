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

export function useCurrentInterestRunStatus(runId: number | null, enabled = true) {
  return api.causation.getCurrentInterestRun.useQuery({
    queryKey: ['causation', 'current-interest', 'run', runId],
    queryData: {
      params: { id: runId ?? 0 },
      query: {},
    },
    enabled: enabled && Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.body?.status;
      if (!status) return false;
      return status === 'QUEUED' || status === 'RUNNING' ? 3000 : false;
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
