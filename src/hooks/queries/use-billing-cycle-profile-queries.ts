import { api } from '@/clients/api';
import type { ListBillingCycleProfilesQuery } from '@/schemas/billing-cycle-profile';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const billingCycleProfilesKeys = {
  all: ['billing-cycle-profiles'] as const,

  lists: () => [...billingCycleProfilesKeys.all, 'list'] as const,
  list: (filters: Partial<ListBillingCycleProfilesQuery> = {}) =>
    [...billingCycleProfilesKeys.lists(), filters] as const,

  details: () => [...billingCycleProfilesKeys.all, 'detail'] as const,
  detail: (id: number) => [...billingCycleProfilesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListBillingCycleProfilesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['creditProduct', 'agreement', 'billingCycleProfileCycles'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListBillingCycleProfilesQuery;
  return query;
}

export function useBillingCycleProfiles(filters: Partial<ListBillingCycleProfilesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.billingCycleProfile.list.useQuery({
    queryKey: billingCycleProfilesKeys.list(query),
    queryData: { query },
  });
}

export function useBillingCycleProfile(
  id: number,
  options?: Partial<Pick<ListBillingCycleProfilesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.billingCycleProfile.getById.useQuery({
    queryKey: billingCycleProfilesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateBillingCycleProfile() {
  const queryClient = api.useQueryClient();

  return api.billingCycleProfile.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingCycleProfilesKeys.lists() });
      toast.success('Perfil de ciclo creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateBillingCycleProfile() {
  const queryClient = api.useQueryClient();

  return api.billingCycleProfile.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: billingCycleProfilesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billingCycleProfilesKeys.detail(id) });
      toast.success('Perfil de ciclo actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteBillingCycleProfile() {
  const queryClient = api.useQueryClient();

  return api.billingCycleProfile.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: billingCycleProfilesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: billingCycleProfilesKeys.lists() });
      toast.success('Perfil de ciclo eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchBillingCycleProfiles(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListBillingCycleProfilesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: billingCycleProfilesKeys.list(query),
    queryFn: () => api.billingCycleProfile.list.query({ query }),
  });
  return;
}
