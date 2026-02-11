import { api } from '@/clients/api';
import type { ListAgingProfilesQuery } from '@/schemas/aging-profile';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const agingProfilesKeys = {
  all: ['aging-profiles'] as const,

  lists: () => [...agingProfilesKeys.all, 'list'] as const,
  list: (filters: Partial<ListAgingProfilesQuery> = {}) =>
    [...agingProfilesKeys.lists(), filters] as const,

  details: () => [...agingProfilesKeys.all, 'detail'] as const,
  detail: (id: number) => [...agingProfilesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListAgingProfilesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['agingBuckets'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListAgingProfilesQuery;
  return query;
}

export function useAgingProfiles(filters: Partial<ListAgingProfilesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.agingProfile.list.useQuery({
    queryKey: agingProfilesKeys.list(query),
    queryData: { query },
  });
}

export function useAgingProfile(
  id: number,
  options?: Partial<Pick<ListAgingProfilesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.agingProfile.getById.useQuery({
    queryKey: agingProfilesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateAgingProfile() {
  const queryClient = api.useQueryClient();

  return api.agingProfile.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agingProfilesKeys.lists() });
      toast.success('Perfil de aging creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateAgingProfile() {
  const queryClient = api.useQueryClient();

  return api.agingProfile.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: agingProfilesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agingProfilesKeys.detail(id) });
      toast.success('Perfil de aging actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteAgingProfile() {
  const queryClient = api.useQueryClient();

  return api.agingProfile.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: agingProfilesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agingProfilesKeys.lists() });
      toast.success('Perfil de aging eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeactivateAgingProfile() {
  const queryClient = api.useQueryClient();

  return api.agingProfile.deactivate.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: agingProfilesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agingProfilesKeys.detail(id) });
      toast.success('Perfil de aging inactivado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchAgingProfiles(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListAgingProfilesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: agingProfilesKeys.list(query),
    queryFn: () => api.agingProfile.list.query({ query }),
  });
  return;
}
