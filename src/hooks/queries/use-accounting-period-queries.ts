import { api } from '@/clients/api';
import type { ListAccountingPeriodsQuery } from '@/schemas/accounting-period';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const accountingPeriodsKeys = {
  all: ['accounting-periods'] as const,

  lists: () => [...accountingPeriodsKeys.all, 'list'] as const,
  list: (filters: Partial<ListAccountingPeriodsQuery> = {}) =>
    [...accountingPeriodsKeys.lists(), filters] as const,

  details: () => [...accountingPeriodsKeys.all, 'detail'] as const,
  detail: (id: number) => [...accountingPeriodsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListAccountingPeriodsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    sort: filters?.sort ?? [{ field: 'year', order: 'desc' }, { field: 'month', order: 'desc' }],
    where: filters?.where,
    search: filters?.search,
  } as ListAccountingPeriodsQuery;
  return query;
}

export function useAccountingPeriods(filters: Partial<ListAccountingPeriodsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.accountingPeriod.list.useQuery({
    queryKey: accountingPeriodsKeys.list(query),
    queryData: { query },
  });
}

export function useAccountingPeriod(id: number, options?: { enabled?: boolean }) {
  return api.accountingPeriod.getById.useQuery({
    queryKey: accountingPeriodsKeys.detail(id),
    queryData: { params: { id }, query: {} },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateAccountingPeriod() {
  const queryClient = api.useQueryClient();

  return api.accountingPeriod.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingPeriodsKeys.lists() });
      toast.success('Periodo contable creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateAccountingPeriod() {
  const queryClient = api.useQueryClient();

  return api.accountingPeriod.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: accountingPeriodsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountingPeriodsKeys.detail(id) });
      toast.success('Periodo contable actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteAccountingPeriod() {
  const queryClient = api.useQueryClient();

  return api.accountingPeriod.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: accountingPeriodsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: accountingPeriodsKeys.lists() });
      toast.success('Periodo contable eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchAccountingPeriods(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListAccountingPeriodsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: accountingPeriodsKeys.list(query),
    queryFn: () => api.accountingPeriod.list.query({ query }),
  });
  return;
}
