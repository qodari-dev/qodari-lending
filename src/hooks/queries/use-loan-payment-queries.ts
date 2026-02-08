import { api } from '@/clients/api';
import type { ListLoanPaymentsQuery } from '@/schemas/loan-payment';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const loanPaymentsKeys = {
  all: ['loan-payments'] as const,

  lists: () => [...loanPaymentsKeys.all, 'list'] as const,
  list: (filters: Partial<ListLoanPaymentsQuery> = {}) => [...loanPaymentsKeys.lists(), filters] as const,

  details: () => [...loanPaymentsKeys.all, 'detail'] as const,
  detail: (id: number) => [...loanPaymentsKeys.details(), id] as const,

  availableReceiptTypes: () => [...loanPaymentsKeys.all, 'available-receipt-types'] as const,
};

function defaultQuery(filters?: Partial<ListLoanPaymentsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['loan', 'paymentReceiptType', 'loanPaymentMethodAllocations'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListLoanPaymentsQuery;
  return query;
}

export function useLoanPayments(filters: Partial<ListLoanPaymentsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.loanPayment.list.useQuery({
    queryKey: loanPaymentsKeys.list(query),
    queryData: { query },
  });
}

export function useLoanPayment(
  id: number,
  options?: Partial<Pick<ListLoanPaymentsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.loanPayment.getById.useQuery({
    queryKey: loanPaymentsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useAvailableLoanPaymentReceiptTypes(enabled = true) {
  return api.loanPayment.listAvailableReceiptTypes.useQuery({
    queryKey: loanPaymentsKeys.availableReceiptTypes(),
    queryData: { query: {} },
    enabled,
  });
}

export function useCreateLoanPayment() {
  const queryClient = api.useQueryClient();

  return api.loanPayment.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanPaymentsKeys.lists() });
      toast.success('Abono creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useVoidLoanPayment() {
  const queryClient = api.useQueryClient();

  return api.loanPayment.void.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loanPaymentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanPaymentsKeys.detail(id) });
      toast.success('Abono anulado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchLoanPayments(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListLoanPaymentsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: loanPaymentsKeys.list(query),
    queryFn: () => api.loanPayment.list.query({ query }),
  });
}
