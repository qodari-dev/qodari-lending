import { api } from '@/clients/api';
import type { ListCreditProductsQuery } from '@/schemas/credit-product';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const creditProductsKeys = {
  all: ['credit-products'] as const,

  lists: () => [...creditProductsKeys.all, 'list'] as const,
  list: (filters: Partial<ListCreditProductsQuery> = {}) =>
    [...creditProductsKeys.lists(), filters] as const,

  details: () => [...creditProductsKeys.all, 'detail'] as const,
  detail: (id: number) => [...creditProductsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListCreditProductsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [
      'creditFund',
      'capitalDistribution',
      'interestDistribution',
      'lateInterestDistribution',
      'costCenter',
      'creditProductCategories',
      'creditProductRequiredDocuments',
      'creditProductAccounts',
    ],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListCreditProductsQuery;
  return query;
}

export function useCreditProducts(filters: Partial<ListCreditProductsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.creditProduct.list.useQuery({
    queryKey: creditProductsKeys.list(query),
    queryData: { query },
  });
}

export function useCreditProduct(
  id: number,
  options?: Partial<Pick<ListCreditProductsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.creditProduct.getById.useQuery({
    queryKey: creditProductsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateCreditProduct() {
  const queryClient = api.useQueryClient();

  return api.creditProduct.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditProductsKeys.lists() });
      toast.success('Tipo de credito creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateCreditProduct() {
  const queryClient = api.useQueryClient();

  return api.creditProduct.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: creditProductsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: creditProductsKeys.detail(id) });
      toast.success('Tipo de credito actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteCreditProduct() {
  const queryClient = api.useQueryClient();

  return api.creditProduct.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: creditProductsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: creditProductsKeys.lists() });
      toast.success('Tipo de credito eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchCreditProducts(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListCreditProductsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: creditProductsKeys.list(query),
    queryFn: () => api.creditProduct.list.query({ query }),
  });
  return;
}
