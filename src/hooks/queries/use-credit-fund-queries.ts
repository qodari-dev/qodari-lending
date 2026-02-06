import { api } from '@/clients/api';
import type { ListCreditFundsQuery } from '@/schemas/credit-fund';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const creditFundsKeys = {
  all: ['credit-funds'] as const,

  lists: () => [...creditFundsKeys.all, 'list'] as const,
  list: (filters: Partial<ListCreditFundsQuery> = {}) =>
    [...creditFundsKeys.lists(), filters] as const,

  details: () => [...creditFundsKeys.all, 'detail'] as const,
  detail: (id: number) => [...creditFundsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListCreditFundsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['creditFundBudgets'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListCreditFundsQuery;
  return query;
}

export function useCreditFunds(filters: Partial<ListCreditFundsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.creditFund.list.useQuery({
    queryKey: creditFundsKeys.list(query),
    queryData: { query },
  });
}

export function useCreditFund(
  id: number,
  options?: Partial<Pick<ListCreditFundsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.creditFund.getById.useQuery({
    queryKey: creditFundsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateCreditFund() {
  const queryClient = api.useQueryClient();

  return api.creditFund.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditFundsKeys.lists() });
      toast.success('Fondo de credito creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateCreditFund() {
  const queryClient = api.useQueryClient();

  return api.creditFund.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: creditFundsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: creditFundsKeys.detail(id) });
      toast.success('Fondo de credito actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteCreditFund() {
  const queryClient = api.useQueryClient();

  return api.creditFund.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: creditFundsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: creditFundsKeys.lists() });
      toast.success('Fondo de credito eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchCreditFunds(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListCreditFundsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: creditFundsKeys.list(query),
    queryFn: () => api.creditFund.list.query({ query }),
  });
  return;
}
