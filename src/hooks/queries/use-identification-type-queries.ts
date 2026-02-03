import { api } from '@/clients/api';
import type { ListIdentificationTypesQuery } from '@/schemas/identification-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const identificationTypesKeys = {
  all: ['identification-types'] as const,

  lists: () => [...identificationTypesKeys.all, 'list'] as const,
  list: (filters: Partial<ListIdentificationTypesQuery> = {}) =>
    [...identificationTypesKeys.lists(), filters] as const,

  details: () => [...identificationTypesKeys.all, 'detail'] as const,
  detail: (id: number) => [...identificationTypesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListIdentificationTypesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListIdentificationTypesQuery;
  return query;
}

export function useIdentificationTypes(filters: Partial<ListIdentificationTypesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.identificationType.list.useQuery({
    queryKey: identificationTypesKeys.list(query),
    queryData: { query },
  });
}

export function useIdentificationType(
  id: number,
  options?: Partial<Pick<ListIdentificationTypesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.identificationType.getById.useQuery({
    queryKey: identificationTypesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateIdentificationType() {
  const queryClient = api.useQueryClient();

  return api.identificationType.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: identificationTypesKeys.lists() });
      toast.success('Tipo de identificación creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateIdentificationType() {
  const queryClient = api.useQueryClient();

  return api.identificationType.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: identificationTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: identificationTypesKeys.detail(id) });
      toast.success('Tipo de identificación actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteIdentificationType() {
  const queryClient = api.useQueryClient();

  return api.identificationType.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: identificationTypesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: identificationTypesKeys.lists() });
      toast.success('Tipo de identificación eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchIdentificationTypes(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListIdentificationTypesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: identificationTypesKeys.list(query),
    queryFn: () => api.identificationType.list.query({ query }),
  });
  return;
}
