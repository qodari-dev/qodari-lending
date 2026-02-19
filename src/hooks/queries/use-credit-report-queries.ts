import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

function onError(error: unknown) {
  toast.error(getTsRestErrorMessage(error));
}

export const creditReportKeys = {
  all: ['credit-reports'] as const,
  extract: (creditNumber: string) => [...creditReportKeys.all, 'extract', creditNumber] as const,
  extractByLoanId: (loanId: number) => [...creditReportKeys.all, 'extract-by-loan', loanId] as const,
};

export function useCreditExtractReport(creditNumber: string, enabled = true) {
  return api.creditReport.getExtract.useQuery({
    queryKey: creditReportKeys.extract(creditNumber),
    queryData: {
      query: {
        creditNumber,
      },
    },
    enabled: enabled && !!creditNumber.trim(),
  });
}

export function useCreditExtractReportByLoanId(loanId: number, enabled = true) {
  return api.creditReport.getExtractByLoanId.useQuery({
    queryKey: creditReportKeys.extractByLoanId(loanId),
    queryData: {
      params: { id: loanId },
      query: {},
    },
    enabled: enabled && loanId > 0,
  });
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
