import { api } from '@/clients/api';
import type { ListGlAccountsQuery } from '@/schemas/gl-account';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const glAccountsKeys = {
  all: ['gl-accounts'] as const,

  lists: () => [...glAccountsKeys.all, 'list'] as const,
  list: (filters: Partial<ListGlAccountsQuery> = {}) =>
    [...glAccountsKeys.lists(), filters] as const,

  details: () => [...glAccountsKeys.all, 'detail'] as const,
  detail: (id: number) => [...glAccountsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListGlAccountsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListGlAccountsQuery;
  return query;
}

export function useGlAccounts(filters: Partial<ListGlAccountsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.glAccount.list.useQuery({
    queryKey: glAccountsKeys.list(query),
    queryData: { query },
  });
}

export function useGlAccount(
  id: number,
  options?: Partial<Pick<ListGlAccountsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.glAccount.getById.useQuery({
    queryKey: glAccountsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateGlAccount() {
  const queryClient = api.useQueryClient();

  return api.glAccount.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glAccountsKeys.lists() });
      toast.success('Cuenta contable creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateGlAccount() {
  const queryClient = api.useQueryClient();

  return api.glAccount.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: glAccountsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: glAccountsKeys.detail(id) });
      toast.success('Cuenta contable actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteGlAccount() {
  const queryClient = api.useQueryClient();

  return api.glAccount.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: glAccountsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: glAccountsKeys.lists() });
      toast.success('Cuenta contable eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchGlAccounts(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListGlAccountsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: glAccountsKeys.list(query),
    queryFn: () => api.glAccount.list.query({ query }),
  });
  return;
}
