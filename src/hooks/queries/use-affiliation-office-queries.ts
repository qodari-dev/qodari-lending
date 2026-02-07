import { api } from '@/clients/api';
import type { ListAffiliationOfficesQuery } from '@/schemas/affiliation-office';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const affiliationOfficesKeys = {
  all: ['affiliation-offices'] as const,

  lists: () => [...affiliationOfficesKeys.all, 'list'] as const,
  list: (filters: Partial<ListAffiliationOfficesQuery> = {}) =>
    [...affiliationOfficesKeys.lists(), filters] as const,

  details: () => [...affiliationOfficesKeys.all, 'detail'] as const,
  detail: (id: number) => [...affiliationOfficesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListAffiliationOfficesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['city', 'costCenter', 'userAffiliationOffices'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListAffiliationOfficesQuery;

  return query;
}

export function useAffiliationOffices(filters: Partial<ListAffiliationOfficesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.affiliationOffice.list.useQuery({
    queryKey: affiliationOfficesKeys.list(query),
    queryData: { query },
  });
}

export function useAffiliationOffice(
  id: number,
  options?: Partial<Pick<ListAffiliationOfficesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.affiliationOffice.getById.useQuery({
    queryKey: affiliationOfficesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateAffiliationOffice() {
  const queryClient = api.useQueryClient();

  return api.affiliationOffice.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliationOfficesKeys.lists() });
      toast.success('Oficina de afiliacion creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateAffiliationOffice() {
  const queryClient = api.useQueryClient();

  return api.affiliationOffice.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: affiliationOfficesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: affiliationOfficesKeys.detail(id) });
      toast.success('Oficina de afiliacion actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteAffiliationOffice() {
  const queryClient = api.useQueryClient();

  return api.affiliationOffice.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: affiliationOfficesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: affiliationOfficesKeys.lists() });
      toast.success('Oficina de afiliacion eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchAffiliationOffices(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListAffiliationOfficesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: affiliationOfficesKeys.list(query),
    queryFn: () => api.affiliationOffice.list.query({ query }),
  });
}
