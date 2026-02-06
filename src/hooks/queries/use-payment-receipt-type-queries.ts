import { api } from '@/clients/api';
import type { ListPaymentReceiptTypesQuery } from '@/schemas/payment-receipt-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const paymentReceiptTypesKeys = {
  all: ['payment-receipt-types'] as const,

  lists: () => [...paymentReceiptTypesKeys.all, 'list'] as const,
  list: (filters: Partial<ListPaymentReceiptTypesQuery> = {}) =>
    [...paymentReceiptTypesKeys.lists(), filters] as const,

  details: () => [...paymentReceiptTypesKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentReceiptTypesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListPaymentReceiptTypesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['glAccount', 'userPaymentReceiptTypes'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListPaymentReceiptTypesQuery;
  return query;
}

export function usePaymentReceiptTypes(filters: Partial<ListPaymentReceiptTypesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.paymentReceiptType.list.useQuery({
    queryKey: paymentReceiptTypesKeys.list(query),
    queryData: { query },
  });
}

export function usePaymentReceiptType(
  id: number,
  options?: Partial<Pick<ListPaymentReceiptTypesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.paymentReceiptType.getById.useQuery({
    queryKey: paymentReceiptTypesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreatePaymentReceiptType() {
  const queryClient = api.useQueryClient();

  return api.paymentReceiptType.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentReceiptTypesKeys.lists() });
      toast.success('Tipo de recibo de abonos creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdatePaymentReceiptType() {
  const queryClient = api.useQueryClient();

  return api.paymentReceiptType.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: paymentReceiptTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentReceiptTypesKeys.detail(id) });
      toast.success('Tipo de recibo de abonos actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeletePaymentReceiptType() {
  const queryClient = api.useQueryClient();

  return api.paymentReceiptType.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: paymentReceiptTypesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentReceiptTypesKeys.lists() });
      toast.success('Tipo de recibo de abonos eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchPaymentReceiptTypes(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListPaymentReceiptTypesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: paymentReceiptTypesKeys.list(query),
    queryFn: () => api.paymentReceiptType.list.query({ query }),
  });
}
