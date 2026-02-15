import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

export function useProcessAccountingInterfaceCredits() {
  return api.accountingInterface.processCredits.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useProcessAccountingInterfaceCurrentInterest() {
  return api.accountingInterface.processCurrentInterest.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useProcessAccountingInterfaceLateInterest() {
  return api.accountingInterface.processLateInterest.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useProcessAccountingInterfacePayments() {
  return api.accountingInterface.processPayments.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useProcessAccountingInterfaceWriteOff() {
  return api.accountingInterface.processWriteOff.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useProcessAccountingInterfaceProvision() {
  return api.accountingInterface.processProvision.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}
