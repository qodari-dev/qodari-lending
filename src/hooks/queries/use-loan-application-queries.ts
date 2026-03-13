import { api } from '@/clients/api';
import {
  ListLoanApplicationInboxQuerySchema,
  ListLoanApplicationActNumbersQuerySchema,
  type ListLoanApplicationsQuery,
} from '@/schemas/loan-application';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

type ListLoanApplicationActNumbersQuery = z.infer<typeof ListLoanApplicationActNumbersQuerySchema>;
type ListLoanApplicationInboxQuery = z.infer<typeof ListLoanApplicationInboxQuerySchema>;

export const loanApplicationsKeys = {
  all: ['loan-applications'] as const,

  lists: () => [...loanApplicationsKeys.all, 'list'] as const,
  list: (filters: Partial<ListLoanApplicationsQuery> = {}) =>
    [...loanApplicationsKeys.lists(), filters] as const,

  details: () => [...loanApplicationsKeys.all, 'detail'] as const,
  detail: (id: number) => [...loanApplicationsKeys.details(), id] as const,

  approvalLoad: () => [...loanApplicationsKeys.all, 'approval-load'] as const,
  approvalLoadDetail: (levelId: number) => [...loanApplicationsKeys.approvalLoad(), levelId] as const,

  inbox: () => [...loanApplicationsKeys.all, 'inbox'] as const,
  inboxList: (filters: Partial<ListLoanApplicationInboxQuery> = {}) =>
    [...loanApplicationsKeys.inbox(), filters] as const,

  actNumbers: () => [...loanApplicationsKeys.all, 'act-numbers'] as const,
  actNumbersList: (query: ListLoanApplicationActNumbersQuery) =>
    [...loanApplicationsKeys.actNumbers(), query] as const,

  subsidyPledgeLookup: () => [...loanApplicationsKeys.all, 'subsidy-pledge-lookup'] as const,
  subsidyPledgeLookupDetail: (thirdPartyId: number) =>
    [...loanApplicationsKeys.subsidyPledgeLookup(), thirdPartyId] as const,
};

function defaultQuery(filters?: Partial<ListLoanApplicationsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [
      'thirdParty',
      'agreement',
      'creditProduct',
      'creditFund',
      'paymentFrequency',
      'affiliationOffice',
      'bank',
      'channel',
      'insuranceCompany',
      'rejectionReason',
      'loanApplicationCoDebtors',
      'loanApplicationDocuments',
      'loanApplicationPledges',
      'currentApprovalLevel',
      'targetApprovalLevel',
      'loanApplicationApprovalHistory',
      'loanApplicationStatusHistory',
      'loanApplicationRiskAssessments',
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

export function useLoanApplicationApprovalLoad(levelId?: number, options?: { enabled?: boolean }) {
  return api.loanApplication.approvalLoad.useQuery({
    queryKey: loanApplicationsKeys.approvalLoadDetail(levelId ?? 0),
    queryData: {
      query: { levelId: levelId ?? 0 },
    },
    enabled: (options?.enabled ?? true) && typeof levelId === 'number' && levelId > 0,
  });
}

export function useLoanApplicationInbox(filters: Partial<ListLoanApplicationInboxQuery> = {}) {
  const query = defaultQuery(filters);

  return api.loanApplication.inbox.useQuery({
    queryKey: loanApplicationsKeys.inboxList(query),
    queryData: { query },
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

export function useReassignLoanApplications() {
  const queryClient = api.useQueryClient();

  return api.loanApplication.reassign.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.inbox() });
      toast.success('Solicitudes reasignadas correctamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useReassignLoanApplication() {
  const queryClient = api.useQueryClient();

  return api.loanApplication.reassignOne.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: loanApplicationsKeys.inbox() });
      toast.success('Solicitud reasignada correctamente');
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

export function useLoanApplicationSubsidyPledgeLookup(
  thirdPartyId?: number,
  options?: { enabled?: boolean }
) {
  return api.loanApplication.subsidyPledgeLookup.useQuery({
    queryKey: loanApplicationsKeys.subsidyPledgeLookupDetail(thirdPartyId ?? 0),
    queryData: {
      params: {
        thirdPartyId: thirdPartyId ?? 0,
      },
    },
    enabled: (options?.enabled ?? true) && typeof thirdPartyId === 'number' && thirdPartyId > 0,
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

export async function prefetchLoanApplicationInbox(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListLoanApplicationInboxQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: loanApplicationsKeys.inboxList(query),
    queryFn: () => api.loanApplication.inbox.query({ query }),
  });
}
