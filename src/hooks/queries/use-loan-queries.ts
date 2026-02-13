import { api } from '@/clients/api';
import type { ListLoansQuery } from '@/schemas/loan';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const loansKeys = {
  all: ['loans'] as const,

  lists: () => [...loansKeys.all, 'list'] as const,
  list: (filters: Partial<ListLoansQuery> = {}) => [...loansKeys.lists(), filters] as const,

  details: () => [...loansKeys.all, 'detail'] as const,
  detail: (id: number) => [...loansKeys.details(), id] as const,
  balanceSummary: (id: number) => [...loansKeys.all, 'balance-summary', id] as const,
  statement: (id: number, filters: { from?: Date; to?: Date } = {}) =>
    [
      ...loansKeys.all,
      'statement',
      id,
      filters.from ? filters.from.toISOString().slice(0, 10) : null,
      filters.to ? filters.to.toISOString().slice(0, 10) : null,
    ] as const,
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

export function useLiquidateLoan() {
  const queryClient = api.useQueryClient();

  return api.loan.liquidate.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loansKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loansKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: loansKeys.balanceSummary(id) });
      queryClient.invalidateQueries({ queryKey: [...loansKeys.all, 'statement', id] });
      toast.success('Credito liquidado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useVoidLoan() {
  const queryClient = api.useQueryClient();

  return api.loan.void.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loansKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loansKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: loansKeys.balanceSummary(id) });
      queryClient.invalidateQueries({ queryKey: [...loansKeys.all, 'statement', id] });
      toast.success('Credito anulado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateLoanLegalProcess() {
  const queryClient = api.useQueryClient();

  return api.loan.updateLegalProcess.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loansKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loansKeys.detail(id) });
      toast.success('Proceso juridico actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateLoanPaymentAgreement() {
  const queryClient = api.useQueryClient();

  return api.loan.updatePaymentAgreement.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loansKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loansKeys.detail(id) });
      toast.success('Acuerdo de pago actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useLoanBalanceSummary(id: number, options?: { enabled?: boolean }) {
  return api.loan.getBalanceSummary.useQuery({
    queryKey: loansKeys.balanceSummary(id),
    queryData: {
      params: { id },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useLoanStatement(
  id: number,
  filters: { from?: Date; to?: Date } = {},
  options?: { enabled?: boolean }
) {
  return api.loan.getStatement.useQuery({
    queryKey: loansKeys.statement(id, filters),
    queryData: {
      params: { id },
      query: {
        from: filters.from,
        to: filters.to,
      },
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
