import { api } from '@/clients/api';
import {
  ListLoanApplicationActNumbersQuerySchema,
  type ListLoanApplicationsQuery,
} from '@/schemas/loan-application';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

type ListLoanApplicationActNumbersQuery = z.infer<typeof ListLoanApplicationActNumbersQuerySchema>;

export const loanApplicationsKeys = {
  all: ['loan-applications'] as const,

  lists: () => [...loanApplicationsKeys.all, 'list'] as const,
  list: (filters: Partial<ListLoanApplicationsQuery> = {}) =>
    [...loanApplicationsKeys.lists(), filters] as const,

  details: () => [...loanApplicationsKeys.all, 'detail'] as const,
  detail: (id: number) => [...loanApplicationsKeys.details(), id] as const,

  actNumbers: () => [...loanApplicationsKeys.all, 'act-numbers'] as const,
  actNumbersList: (query: ListLoanApplicationActNumbersQuery) =>
    [...loanApplicationsKeys.actNumbers(), query] as const,
};

function defaultQuery(filters?: Partial<ListLoanApplicationsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [
      'thirdParty',
      'creditProduct',
      'affiliationOffice',
      'bank',
      'channel',
      'insuranceCompany',
      'rejectionReason',
      'loanApplicationCoDebtors',
      'loanApplicationDocuments',
      'loanApplicationPledges',
      'loanApplicationStatusHistory',
    ],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListLoanApplicationsQuery;
  return query;
}

export function useLoanApplications(filters: Partial<ListLoanApplicationsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.loanApplication.list.useQuery({
    queryKey: loanApplicationsKeys.list(query),
    queryData: { query },
  });
}

export function useLoanApplication(
  id: number,
  options?: Partial<Pick<ListLoanApplicationsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.loanApplication.getById.useQuery({
    queryKey: loanApplicationsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateLoanApplication() {
  const queryClient = api.useQueryClient();

  return api.loanApplication.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.lists() });
      toast.success('Solicitud de credito creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateLoanApplication() {
  const queryClient = api.useQueryClient();

  return api.loanApplication.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.detail(id) });
      toast.success('Solicitud de credito actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useCancelLoanApplication() {
  const queryClient = api.useQueryClient();

  return api.loanApplication.cancel.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.detail(id) });
      toast.success('Solicitud de credito cancelada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useRejectLoanApplication() {
  const queryClient = api.useQueryClient();

  return api.loanApplication.reject.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.detail(id) });
      toast.success('Solicitud de credito rechazada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useApproveLoanApplication() {
  const queryClient = api.useQueryClient();

  return api.loanApplication.approve.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.detail(id) });
      toast.success('Solicitud de credito aprobada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function usePresignLoanApplicationDocumentUpload() {
  return api.loanApplication.presignDocumentUpload.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function usePresignLoanApplicationDocumentView() {
  return api.loanApplication.presignDocumentView.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useLoanApplicationActNumbers(query: ListLoanApplicationActNumbersQuery) {
  return api.loanApplication.listActNumbers.useQuery({
    queryKey: loanApplicationsKeys.actNumbersList(query),
    queryData: { query },
    enabled: !!query.affiliationOfficeId,
  });
}

export async function prefetchLoanApplications(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListLoanApplicationsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: loanApplicationsKeys.list(query),
    queryFn: () => api.loanApplication.list.query({ query }),
  });
}
