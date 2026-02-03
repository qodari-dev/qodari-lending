import { api } from '@/clients/api';
import type { ListInvestmentTypesQuery } from '@/schemas/investment-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const investmentTypesKeys = {
  all: ['investment-types'] as const,

  lists: () => [...investmentTypesKeys.all, 'list'] as const,
  list: (filters: Partial<ListInvestmentTypesQuery> = {}) =>
    [...investmentTypesKeys.lists(), filters] as const,

  details: () => [...investmentTypesKeys.all, 'detail'] as const,
  detail: (id: number) => [...investmentTypesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListInvestmentTypesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListInvestmentTypesQuery;
  return query;
}

export function useInvestmentTypes(filters: Partial<ListInvestmentTypesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.investmentType.list.useQuery({
    queryKey: investmentTypesKeys.list(query),
    queryData: { query },
  });
}

export function useInvestmentType(
  id: number,
  options?: Partial<Pick<ListInvestmentTypesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.investmentType.getById.useQuery({
    queryKey: investmentTypesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateInvestmentType() {
  const queryClient = api.useQueryClient();

  return api.investmentType.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentTypesKeys.lists() });
      toast.success('Tipo de inversión creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateInvestmentType() {
  const queryClient = api.useQueryClient();

  return api.investmentType.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: investmentTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: investmentTypesKeys.detail(id) });
      toast.success('Tipo de inversión actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteInvestmentType() {
  const queryClient = api.useQueryClient();

  return api.investmentType.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: investmentTypesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: investmentTypesKeys.lists() });
      toast.success('Tipo de inversión eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchInvestmentTypes(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListInvestmentTypesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: investmentTypesKeys.list(query),
    queryFn: () => api.investmentType.list.query({ query }),
  });
  return;
}
