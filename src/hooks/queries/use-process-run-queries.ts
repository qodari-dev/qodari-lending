import { api } from '@/clients/api';
import type { ListProcessRunsQuery } from '@/schemas/process-run';
import { useQueryClient } from '@tanstack/react-query';

export const processRunsKeys = {
  all: ['process-runs'] as const,

  lists: () => [...processRunsKeys.all, 'list'] as const,
  list: (filters: Partial<ListProcessRunsQuery> = {}) => [...processRunsKeys.lists(), filters] as const,

  details: () => [...processRunsKeys.all, 'detail'] as const,
  detail: (id: number) => [...processRunsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListProcessRunsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['accountingPeriod'],
    sort: filters?.sort ?? [{ field: 'createdAt', order: 'desc' }],
    where: filters?.where,
    search: filters?.search,
  } as ListProcessRunsQuery;
  return query;
}

export function useProcessRuns(filters: Partial<ListProcessRunsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.processRun.list.useQuery({
    queryKey: processRunsKeys.list(query),
    queryData: { query },
  });
}

export function useProcessRun(
  id: number,
  options?: Partial<Pick<ListProcessRunsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.processRun.getById.useQuery({
    queryKey: processRunsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? ['accountingPeriod'] },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export async function prefetchProcessRuns(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListProcessRunsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: processRunsKeys.list(query),
    queryFn: () => api.processRun.list.query({ query }),
  });
}
