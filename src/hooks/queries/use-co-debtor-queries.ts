import { api } from '@/clients/api';
import type { ListCoDebtorsQuery } from '@/schemas/co-debtor';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const coDebtorsKeys = {
  all: ['co-debtors'] as const,

  lists: () => [...coDebtorsKeys.all, 'list'] as const,
  list: (filters: Partial<ListCoDebtorsQuery> = {}) =>
    [...coDebtorsKeys.lists(), filters] as const,

  details: () => [...coDebtorsKeys.all, 'detail'] as const,
  detail: (id: number) => [...coDebtorsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListCoDebtorsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListCoDebtorsQuery;
  return query;
}

export function useCoDebtors(filters: Partial<ListCoDebtorsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.coDebtor.list.useQuery({
    queryKey: coDebtorsKeys.list(query),
    queryData: { query },
  });
}

export function useCoDebtor(
  id: number,
  options?: Partial<Pick<ListCoDebtorsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.coDebtor.getById.useQuery({
    queryKey: coDebtorsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateCoDebtor() {
  const queryClient = api.useQueryClient();

  return api.coDebtor.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coDebtorsKeys.lists() });
      toast.success('Codeudor creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateCoDebtor() {
  const queryClient = api.useQueryClient();

  return api.coDebtor.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: coDebtorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: coDebtorsKeys.detail(id) });
      toast.success('Codeudor actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteCoDebtor() {
  const queryClient = api.useQueryClient();

  return api.coDebtor.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: coDebtorsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: coDebtorsKeys.lists() });
      toast.success('Codeudor eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchCoDebtors(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListCoDebtorsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: coDebtorsKeys.list(query),
    queryFn: () => api.coDebtor.list.query({ query }),
  });
  return;
}
