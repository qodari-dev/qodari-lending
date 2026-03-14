import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

export const subsidyKeys = {
  all: ['subsidy'] as const,
  pledgePaymentVouchers: () => [...subsidyKeys.all, 'pledge-payment-vouchers'] as const,
  pledgePaymentVoucherList: (limit: number) =>
    [...subsidyKeys.pledgePaymentVouchers(), 'list', limit] as const,
  pledgePaymentVoucherDetail: (id: number) =>
    [...subsidyKeys.pledgePaymentVouchers(), 'detail', id] as const,
};

export function useGeneratePledgePaymentVoucher() {
  const queryClient = api.useQueryClient();

  return api.subsidy.generatePledgePaymentVoucher.useMutation({
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: subsidyKeys.pledgePaymentVouchers() });
      queryClient.setQueryData(
        subsidyKeys.pledgePaymentVoucherDetail(response.body.voucherId),
        response.body
      );
      toast.success('Lote de pignoración encolado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useSubsidyPledgePaymentVouchers(limit = 10, options?: {
  refetchInterval?: number | false;
}) {
  return api.subsidy.listPledgePaymentVouchers.useQuery({
    queryKey: subsidyKeys.pledgePaymentVoucherList(limit),
    queryData: {
      query: { limit },
    },
    refetchInterval: options?.refetchInterval ?? false,
  });
}

export function useSubsidyPledgePaymentVoucher(
  id: number,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  }
) {
  return api.subsidy.getPledgePaymentVoucher.useQuery({
    queryKey: subsidyKeys.pledgePaymentVoucherDetail(id),
    queryData: {
      params: { id },
    },
    enabled: options?.enabled ?? !!id,
    refetchInterval: options?.refetchInterval ?? false,
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
