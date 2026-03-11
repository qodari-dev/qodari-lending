import { api } from '@/clients/api';
import type { BillingDispatchInclude, ListBillingDispatchesQuery } from '@/schemas/billing-dispatch';
import { useQueryClient } from '@tanstack/react-query';

export const billingDispatchKeys = {
  all: ['billing-dispatches'] as const,

  lists: () => [...billingDispatchKeys.all, 'list'] as const,
  list: (filters: Partial<ListBillingDispatchesQuery> = {}) =>
    [...billingDispatchKeys.lists(), filters] as const,

  details: () => [...billingDispatchKeys.all, 'detail'] as const,
  detail: (id: number, include?: BillingDispatchInclude[]) =>
    [...billingDispatchKeys.details(), id, include] as const,
};

function defaultQuery(filters?: Partial<ListBillingDispatchesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['agreement'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListBillingDispatchesQuery;
  return query;
}

export function useBillingDispatches(filters: Partial<ListBillingDispatchesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.billingDispatch.list.useQuery({
    queryKey: billingDispatchKeys.list(query),
    queryData: { query },
    refetchInterval: (q) => {
      const dispatches = q.state.data?.body?.data ?? [];
      const hasRunning = dispatches.some(
        (item) => item.status === 'QUEUED' || item.status === 'RUNNING'
      );
      return hasRunning ? 5000 : false;
    },
  });
}

export function useBillingDispatch(
  id: number,
  options?: { include?: BillingDispatchInclude[]; enabled?: boolean }
) {
  const include = options?.include ?? ['agreement', 'items'];

  return api.billingDispatch.getById.useQuery({
    queryKey: billingDispatchKeys.detail(id, include),
    queryData: {
      params: { id },
      query: { include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export async function prefetchBillingDispatches(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListBillingDispatchesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: billingDispatchKeys.list(query),
    queryFn: () => api.billingDispatch.list.query({ query }),
  });
}
