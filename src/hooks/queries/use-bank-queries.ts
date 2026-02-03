import { api } from '@/clients/api';
import type { ListBanksQuery } from '@/schemas/bank';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const banksKeys = {
  all: ['banks'] as const,

  lists: () => [...banksKeys.all, 'list'] as const,
  list: (filters: Partial<ListBanksQuery> = {}) =>
    [...banksKeys.lists(), filters] as const,

  details: () => [...banksKeys.all, 'detail'] as const,
  detail: (id: number) => [...banksKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListBanksQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListBanksQuery;
  return query;
}

export function useBanks(filters: Partial<ListBanksQuery> = {}) {
  const query = defaultQuery(filters);

  return api.bank.list.useQuery({
    queryKey: banksKeys.list(query),
    queryData: { query },
  });
}

export function useBank(
  id: number,
  options?: Partial<Pick<ListBanksQuery, 'include'>> & { enabled?: boolean }
) {
  return api.bank.getById.useQuery({
    queryKey: banksKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateBank() {
  const queryClient = api.useQueryClient();

  return api.bank.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: banksKeys.lists() });
      toast.success('Banco creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateBank() {
  const queryClient = api.useQueryClient();

  return api.bank.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: banksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: banksKeys.detail(id) });
      toast.success('Banco actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteBank() {
  const queryClient = api.useQueryClient();

  return api.bank.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: banksKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: banksKeys.lists() });
      toast.success('Banco eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchBanks(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListBanksQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: banksKeys.list(query),
    queryFn: () => api.bank.list.query({ query }),
  });
  return;
}
