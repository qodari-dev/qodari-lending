import { api } from '@/clients/api';
import type { ListCitiesQuery } from '@/schemas/city';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const citiesKeys = {
  all: ['cities'] as const,

  lists: () => [...citiesKeys.all, 'list'] as const,
  list: (filters: Partial<ListCitiesQuery> = {}) => [...citiesKeys.lists(), filters] as const,

  details: () => [...citiesKeys.all, 'detail'] as const,
  detail: (id: number) => [...citiesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListCitiesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListCitiesQuery;
  return query;
}

export function useCities(filters: Partial<ListCitiesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.city.list.useQuery({
    queryKey: citiesKeys.list(query),
    queryData: { query },
  });
}

export function useCity(
  id: number,
  options?: Partial<Pick<ListCitiesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.city.getById.useQuery({
    queryKey: citiesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateCity() {
  const queryClient = api.useQueryClient();

  return api.city.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: citiesKeys.lists() });
      toast.success('Ciudad creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateCity() {
  const queryClient = api.useQueryClient();

  return api.city.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: citiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: citiesKeys.detail(id) });
      toast.success('Ciudad actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteCity() {
  const queryClient = api.useQueryClient();

  return api.city.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: citiesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: citiesKeys.lists() });
      toast.success('Ciudad eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchCities(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListCitiesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: citiesKeys.list(query),
    queryFn: () => api.city.list.query({ query }),
  });
  return;
}
