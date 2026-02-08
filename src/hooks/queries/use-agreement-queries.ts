import { api } from '@/clients/api';
import type { ListAgreementsQuery } from '@/schemas/agreement';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const agreementsKeys = {
  all: ['agreements'] as const,

  lists: () => [...agreementsKeys.all, 'list'] as const,
  list: (filters: Partial<ListAgreementsQuery> = {}) =>
    [...agreementsKeys.lists(), filters] as const,

  details: () => [...agreementsKeys.all, 'detail'] as const,
  detail: (id: number) => [...agreementsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListAgreementsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListAgreementsQuery;
  return query;
}

export function useAgreements(filters: Partial<ListAgreementsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.agreement.list.useQuery({
    queryKey: agreementsKeys.list(query),
    queryData: { query },
  });
}

export function useAgreement(
  id: number,
  options?: Partial<Pick<ListAgreementsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.agreement.getById.useQuery({
    queryKey: agreementsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateAgreement() {
  const queryClient = api.useQueryClient();

  return api.agreement.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementsKeys.lists() });
      toast.success('Convenio creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateAgreement() {
  const queryClient = api.useQueryClient();

  return api.agreement.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: agreementsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agreementsKeys.detail(id) });
      toast.success('Convenio actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteAgreement() {
  const queryClient = api.useQueryClient();

  return api.agreement.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: agreementsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agreementsKeys.lists() });
      toast.success('Convenio eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchAgreements(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListAgreementsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: agreementsKeys.list(query),
    queryFn: () => api.agreement.list.query({ query }),
  });
  return;
}
