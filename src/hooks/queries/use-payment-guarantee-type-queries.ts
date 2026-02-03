import { api } from '@/clients/api';
import type { ListPaymentGuaranteeTypesQuery } from '@/schemas/payment-guarantee-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const paymentGuaranteeTypesKeys = {
  all: ['payment-guarantee-types'] as const,

  lists: () => [...paymentGuaranteeTypesKeys.all, 'list'] as const,
  list: (filters: Partial<ListPaymentGuaranteeTypesQuery> = {}) =>
    [...paymentGuaranteeTypesKeys.lists(), filters] as const,

  details: () => [...paymentGuaranteeTypesKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentGuaranteeTypesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListPaymentGuaranteeTypesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListPaymentGuaranteeTypesQuery;
  return query;
}

export function usePaymentGuaranteeTypes(filters: Partial<ListPaymentGuaranteeTypesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.paymentGuaranteeType.list.useQuery({
    queryKey: paymentGuaranteeTypesKeys.list(query),
    queryData: { query },
  });
}

export function usePaymentGuaranteeType(
  id: number,
  options?: Partial<Pick<ListPaymentGuaranteeTypesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.paymentGuaranteeType.getById.useQuery({
    queryKey: paymentGuaranteeTypesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreatePaymentGuaranteeType() {
  const queryClient = api.useQueryClient();

  return api.paymentGuaranteeType.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentGuaranteeTypesKeys.lists() });
      toast.success('Garantía de pago creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdatePaymentGuaranteeType() {
  const queryClient = api.useQueryClient();

  return api.paymentGuaranteeType.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: paymentGuaranteeTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentGuaranteeTypesKeys.detail(id) });
      toast.success('Garantía de pago actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeletePaymentGuaranteeType() {
  const queryClient = api.useQueryClient();

  return api.paymentGuaranteeType.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: paymentGuaranteeTypesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentGuaranteeTypesKeys.lists() });
      toast.success('Garantía de pago eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchPaymentGuaranteeTypes(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListPaymentGuaranteeTypesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: paymentGuaranteeTypesKeys.list(query),
    queryFn: () => api.paymentGuaranteeType.list.query({ query }),
  });
  return;
}
