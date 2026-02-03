import { api } from '@/clients/api';
import type { ListPaymentFrequenciesQuery } from '@/schemas/payment-frequency';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const paymentFrequenciesKeys = {
  all: ['payment-frequencies'] as const,

  lists: () => [...paymentFrequenciesKeys.all, 'list'] as const,
  list: (filters: Partial<ListPaymentFrequenciesQuery> = {}) =>
    [...paymentFrequenciesKeys.lists(), filters] as const,

  details: () => [...paymentFrequenciesKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentFrequenciesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListPaymentFrequenciesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListPaymentFrequenciesQuery;
  return query;
}

export function usePaymentFrequencies(filters: Partial<ListPaymentFrequenciesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.paymentFrequency.list.useQuery({
    queryKey: paymentFrequenciesKeys.list(query),
    queryData: { query },
  });
}

export function usePaymentFrequency(
  id: number,
  options?: Partial<Pick<ListPaymentFrequenciesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.paymentFrequency.getById.useQuery({
    queryKey: paymentFrequenciesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreatePaymentFrequency() {
  const queryClient = api.useQueryClient();

  return api.paymentFrequency.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentFrequenciesKeys.lists() });
      toast.success('Periodicidad de pago creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdatePaymentFrequency() {
  const queryClient = api.useQueryClient();

  return api.paymentFrequency.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: paymentFrequenciesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentFrequenciesKeys.detail(id) });
      toast.success('Periodicidad de pago actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeletePaymentFrequency() {
  const queryClient = api.useQueryClient();

  return api.paymentFrequency.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: paymentFrequenciesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentFrequenciesKeys.lists() });
      toast.success('Periodicidad de pago eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchPaymentFrequencies(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListPaymentFrequenciesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: paymentFrequenciesKeys.list(query),
    queryFn: () => api.paymentFrequency.list.query({ query }),
  });
  return;
}
