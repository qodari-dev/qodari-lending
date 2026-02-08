import { api } from '@/clients/api';
import type { ListLoansQuery } from '@/schemas/loan';
import { useQueryClient } from '@tanstack/react-query';

export const loansKeys = {
  all: ['loans'] as const,

  lists: () => [...loansKeys.all, 'list'] as const,
  list: (filters: Partial<ListLoansQuery> = {}) => [...loansKeys.lists(), filters] as const,

  details: () => [...loansKeys.all, 'detail'] as const,
  detail: (id: number) => [...loansKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListLoansQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [
      'borrower',
      'disbursementParty',
      'agreement',
      'affiliationOffice',
      'paymentFrequency',
      'loanApplication',
    ],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListLoansQuery;
  return query;
}

export function useLoans(filters: Partial<ListLoansQuery> = {}) {
  const query = defaultQuery(filters);

  return api.loan.list.useQuery({
    queryKey: loansKeys.list(query),
    queryData: { query },
  });
}

export function useLoan(
  id: number,
  options?: Partial<Pick<ListLoansQuery, 'include'>> & { enabled?: boolean }
) {
  return api.loan.getById.useQuery({
    queryKey: loansKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export async function prefetchLoans(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListLoansQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: loansKeys.list(query),
    queryFn: () => api.loan.list.query({ query }),
  });
}
