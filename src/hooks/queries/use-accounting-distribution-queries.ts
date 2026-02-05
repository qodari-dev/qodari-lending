import { api } from '@/clients/api';
import type { ListAccountingDistributionsQuery } from '@/schemas/accounting-distribution';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const accountingDistributionsKeys = {
  all: ['accounting-distributions'] as const,

  lists: () => [...accountingDistributionsKeys.all, 'list'] as const,
  list: (filters: Partial<ListAccountingDistributionsQuery> = {}) =>
    [...accountingDistributionsKeys.lists(), filters] as const,

  details: () => [...accountingDistributionsKeys.all, 'detail'] as const,
  detail: (id: number) => [...accountingDistributionsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListAccountingDistributionsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['accountingDistributionLines'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListAccountingDistributionsQuery;
  return query;
}

export function useAccountingDistributions(
  filters: Partial<ListAccountingDistributionsQuery> = {}
) {
  const query = defaultQuery(filters);

  return api.accountingDistribution.list.useQuery({
    queryKey: accountingDistributionsKeys.list(query),
    queryData: { query },
  });
}

export function useAccountingDistribution(
  id: number,
  options?: Partial<Pick<ListAccountingDistributionsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.accountingDistribution.getById.useQuery({
    queryKey: accountingDistributionsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateAccountingDistribution() {
  const queryClient = api.useQueryClient();

  return api.accountingDistribution.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingDistributionsKeys.lists() });
      toast.success('Distribución contable creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateAccountingDistribution() {
  const queryClient = api.useQueryClient();

  return api.accountingDistribution.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: accountingDistributionsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountingDistributionsKeys.detail(id) });
      toast.success('Distribución contable actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteAccountingDistribution() {
  const queryClient = api.useQueryClient();

  return api.accountingDistribution.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: accountingDistributionsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: accountingDistributionsKeys.lists() });
      toast.success('Distribución contable eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchAccountingDistributions(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListAccountingDistributionsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: accountingDistributionsKeys.list(query),
    queryFn: () => api.accountingDistribution.list.query({ query }),
  });
  return;
}
