import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

function onError(error: unknown) {
  toast.error(getTsRestErrorMessage(error));
}

export function useGeneratePaidInstallmentsReport() {
  return api.creditReport.generatePaidInstallments.useMutation({ onError });
}

export function useGenerateLiquidatedCreditsReport() {
  return api.creditReport.generateLiquidatedCredits.useMutation({ onError });
}

export function useGenerateNonLiquidatedCreditsReport() {
  return api.creditReport.generateNonLiquidatedCredits.useMutation({ onError });
}

export function useGenerateCancelledRejectedCreditsReport() {
  return api.creditReport.generateCancelledRejectedCredits.useMutation({ onError });
}

export function useGenerateMovementVoucherReport() {
  return api.creditReport.generateMovementVoucher.useMutation({ onError });
}

export function useGenerateSettledCreditsReport() {
  return api.creditReport.generateSettledCredits.useMutation({ onError });
}

export function useGenerateSuperintendenciaReport() {
  return api.creditReport.generateSuperintendencia.useMutation({ onError });
}

export function useGenerateMinutesPdf() {
  return api.creditReport.generateMinutesPdf.useMutation({ onError });
}

export function useGenerateCreditClearancePdf() {
  return api.creditReport.generateCreditClearancePdf.useMutation({ onError });
}

export function useGenerateThirdPartyClearancePdf() {
  return api.creditReport.generateThirdPartyClearancePdf.useMutation({ onError });
}
