import { api } from '@/clients/api';
import type { ListThirdPartiesQuery } from '@/schemas/third-party';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const thirdPartiesKeys = {
  all: ['third-parties'] as const,

  lists: () => [...thirdPartiesKeys.all, 'list'] as const,
  list: (filters: Partial<ListThirdPartiesQuery> = {}) =>
    [...thirdPartiesKeys.lists(), filters] as const,

  details: () => [...thirdPartiesKeys.all, 'detail'] as const,
  detail: (id: number) => [...thirdPartiesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListThirdPartiesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListThirdPartiesQuery;
  return query;
}

export function useThirdParties(filters: Partial<ListThirdPartiesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.thirdParty.list.useQuery({
    queryKey: thirdPartiesKeys.list(query),
    queryData: { query },
  });
}

export function useThirdParty(
  id: number,
  options?: Partial<Pick<ListThirdPartiesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.thirdParty.getById.useQuery({
    queryKey: thirdPartiesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateThirdParty() {
  const queryClient = api.useQueryClient();

  return api.thirdParty.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thirdPartiesKeys.lists() });
      toast.success('Tercero creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateThirdParty() {
  const queryClient = api.useQueryClient();

  return api.thirdParty.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: thirdPartiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: thirdPartiesKeys.detail(id) });
      toast.success('Tercero actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteThirdParty() {
  const queryClient = api.useQueryClient();

  return api.thirdParty.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: thirdPartiesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: thirdPartiesKeys.lists() });
      toast.success('Tercero eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchThirdParties(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListThirdPartiesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: thirdPartiesKeys.list(query),
    queryFn: () => api.thirdParty.list.query({ query }),
  });
  return;
}
