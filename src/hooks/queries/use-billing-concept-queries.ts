import { api } from '@/clients/api';
import type { ListBillingConceptsQuery } from '@/schemas/billing-concept';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const billingConceptsKeys = {
  all: ['billing-concepts'] as const,

  lists: () => [...billingConceptsKeys.all, 'list'] as const,
  list: (filters: Partial<ListBillingConceptsQuery> = {}) =>
    [...billingConceptsKeys.lists(), filters] as const,

  details: () => [...billingConceptsKeys.all, 'detail'] as const,
  detail: (id: number) => [...billingConceptsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListBillingConceptsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['defaultGlAccount', 'billingConceptRules'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListBillingConceptsQuery;
  return query;
}

export function useBillingConcepts(filters: Partial<ListBillingConceptsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.billingConcept.list.useQuery({
    queryKey: billingConceptsKeys.list(query),
    queryData: { query },
  });
}

export function useBillingConcept(
  id: number,
  options?: Partial<Pick<ListBillingConceptsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.billingConcept.getById.useQuery({
    queryKey: billingConceptsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateBillingConcept() {
  const queryClient = api.useQueryClient();

  return api.billingConcept.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingConceptsKeys.lists() });
      toast.success('Concepto de facturacion creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateBillingConcept() {
  const queryClient = api.useQueryClient();

  return api.billingConcept.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: billingConceptsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billingConceptsKeys.detail(id) });
      toast.success('Concepto de facturacion actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteBillingConcept() {
  const queryClient = api.useQueryClient();

  return api.billingConcept.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: billingConceptsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: billingConceptsKeys.lists() });
      toast.success('Concepto de facturacion eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchBillingConcepts(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListBillingConceptsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: billingConceptsKeys.list(query),
    queryFn: () => api.billingConcept.list.query({ query }),
  });
  return;
}
