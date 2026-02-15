import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

export function useGenerateLoanWriteOffProposal() {
  return api.loanWriteOff.generateProposal.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useReviewLoanWriteOffProposal() {
  return api.loanWriteOff.reviewProposal.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useExecuteLoanWriteOff() {
  return api.loanWriteOff.execute.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}
