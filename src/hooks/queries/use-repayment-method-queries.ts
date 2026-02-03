import { api } from '@/clients/api';
import type { ListRepaymentMethodsQuery } from '@/schemas/repayment-method';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const repaymentMethodsKeys = {
  all: ['repayment-methods'] as const,

  lists: () => [...repaymentMethodsKeys.all, 'list'] as const,
  list: (filters: Partial<ListRepaymentMethodsQuery> = {}) =>
    [...repaymentMethodsKeys.lists(), filters] as const,

  details: () => [...repaymentMethodsKeys.all, 'detail'] as const,
  detail: (id: number) => [...repaymentMethodsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListRepaymentMethodsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListRepaymentMethodsQuery;
  return query;
}

export function useRepaymentMethods(filters: Partial<ListRepaymentMethodsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.repaymentMethod.list.useQuery({
    queryKey: repaymentMethodsKeys.list(query),
    queryData: { query },
  });
}

export function useRepaymentMethod(
  id: number,
  options?: Partial<Pick<ListRepaymentMethodsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.repaymentMethod.getById.useQuery({
    queryKey: repaymentMethodsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateRepaymentMethod() {
  const queryClient = api.useQueryClient();

  return api.repaymentMethod.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repaymentMethodsKeys.lists() });
      toast.success('Forma de pago creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateRepaymentMethod() {
  const queryClient = api.useQueryClient();

  return api.repaymentMethod.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: repaymentMethodsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: repaymentMethodsKeys.detail(id) });
      toast.success('Forma de pago actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteRepaymentMethod() {
  const queryClient = api.useQueryClient();

  return api.repaymentMethod.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: repaymentMethodsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repaymentMethodsKeys.lists() });
      toast.success('Forma de pago eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchRepaymentMethods(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListRepaymentMethodsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: repaymentMethodsKeys.list(query),
    queryFn: () => api.repaymentMethod.list.query({ query }),
  });
  return;
}
