import { api } from '@/clients/api';
import type { ListThirdPartyTypesQuery } from '@/schemas/third-party-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const thirdPartyTypesKeys = {
  all: ['third-party-types'] as const,

  lists: () => [...thirdPartyTypesKeys.all, 'list'] as const,
  list: (filters: Partial<ListThirdPartyTypesQuery> = {}) =>
    [...thirdPartyTypesKeys.lists(), filters] as const,

  details: () => [...thirdPartyTypesKeys.all, 'detail'] as const,
  detail: (id: number) => [...thirdPartyTypesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListThirdPartyTypesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListThirdPartyTypesQuery;
  return query;
}

export function useThirdPartyTypes(filters: Partial<ListThirdPartyTypesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.thirdPartyType.list.useQuery({
    queryKey: thirdPartyTypesKeys.list(query),
    queryData: { query },
  });
}

export function useThirdPartyType(
  id: number,
  options?: Partial<Pick<ListThirdPartyTypesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.thirdPartyType.getById.useQuery({
    queryKey: thirdPartyTypesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateThirdPartyType() {
  const queryClient = api.useQueryClient();

  return api.thirdPartyType.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thirdPartyTypesKeys.lists() });
      toast.success('Tipo de tercero creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateThirdPartyType() {
  const queryClient = api.useQueryClient();

  return api.thirdPartyType.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: thirdPartyTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: thirdPartyTypesKeys.detail(id) });
      toast.success('Tipo de tercero actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteThirdPartyType() {
  const queryClient = api.useQueryClient();

  return api.thirdPartyType.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: thirdPartyTypesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: thirdPartyTypesKeys.lists() });
      toast.success('Tipo de tercero eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchThirdPartyTypes(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListThirdPartyTypesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: thirdPartyTypesKeys.list(query),
    queryFn: () => api.thirdPartyType.list.query({ query }),
  });
  return;
}
