import { api } from '@/clients/api';
import type { ListPaymentTenderTypesQuery } from '@/schemas/payment-tender-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const paymentTenderTypesKeys = {
  all: ['payment-tender-types'] as const,

  lists: () => [...paymentTenderTypesKeys.all, 'list'] as const,
  list: (filters: Partial<ListPaymentTenderTypesQuery> = {}) =>
    [...paymentTenderTypesKeys.lists(), filters] as const,

  details: () => [...paymentTenderTypesKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentTenderTypesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListPaymentTenderTypesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListPaymentTenderTypesQuery;
  return query;
}

export function usePaymentTenderTypes(filters: Partial<ListPaymentTenderTypesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.paymentTenderType.list.useQuery({
    queryKey: paymentTenderTypesKeys.list(query),
    queryData: { query },
  });
}

export function usePaymentTenderType(
  id: number,
  options?: Partial<Pick<ListPaymentTenderTypesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.paymentTenderType.getById.useQuery({
    queryKey: paymentTenderTypesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreatePaymentTenderType() {
  const queryClient = api.useQueryClient();

  return api.paymentTenderType.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentTenderTypesKeys.lists() });
      toast.success('Medio de pago creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdatePaymentTenderType() {
  const queryClient = api.useQueryClient();

  return api.paymentTenderType.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: paymentTenderTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentTenderTypesKeys.detail(id) });
      toast.success('Medio de pago actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeletePaymentTenderType() {
  const queryClient = api.useQueryClient();

  return api.paymentTenderType.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: paymentTenderTypesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentTenderTypesKeys.lists() });
      toast.success('Medio de pago eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchPaymentTenderTypes(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListPaymentTenderTypesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: paymentTenderTypesKeys.list(query),
    queryFn: () => api.paymentTenderType.list.query({ query }),
  });
  return;
}
