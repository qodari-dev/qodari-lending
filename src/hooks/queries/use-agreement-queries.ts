import { api } from '@/clients/api';
import type { ListAgreementsQuery } from '@/schemas/agreement';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const agreementsKeys = {
  all: ['agreements'] as const,

  lists: () => [...agreementsKeys.all, 'list'] as const,
  list: (filters: Partial<ListAgreementsQuery> = {}) =>
    [...agreementsKeys.lists(), filters] as const,

  details: () => [...agreementsKeys.all, 'detail'] as const,
  detail: (id: number) => [...agreementsKeys.details(), id] as const,

  billingEmailDispatches: () => [...agreementsKeys.all, 'billing-email-dispatches'] as const,
  billingEmailDispatchesByAgreement: (agreementId: number, limit: number) =>
    [...agreementsKeys.billingEmailDispatches(), agreementId, limit] as const,
};

function defaultQuery(filters?: Partial<ListAgreementsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListAgreementsQuery;
  return query;
}

export function useAgreements(filters: Partial<ListAgreementsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.agreement.list.useQuery({
    queryKey: agreementsKeys.list(query),
    queryData: { query },
  });
}

export function useAgreement(
  id: number,
  options?: Partial<Pick<ListAgreementsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.agreement.getById.useQuery({
    queryKey: agreementsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateAgreement() {
  const queryClient = api.useQueryClient();

  return api.agreement.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementsKeys.lists() });
      toast.success('Convenio creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateAgreement() {
  const queryClient = api.useQueryClient();

  return api.agreement.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: agreementsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agreementsKeys.detail(id) });
      toast.success('Convenio actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteAgreement() {
  const queryClient = api.useQueryClient();

  return api.agreement.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: agreementsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agreementsKeys.lists() });
      toast.success('Convenio eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useRunAgreementBillingEmails() {
  const queryClient = api.useQueryClient();

  return api.agreement.runBillingEmails.useMutation({
    onSuccess: (response, variables) => {
      const agreementId = variables.body?.agreementId ?? null;
      queryClient.invalidateQueries({ queryKey: agreementsKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: agreementsKeys.billingEmailDispatches(),
      });
      if (agreementId) {
        queryClient.invalidateQueries({ queryKey: agreementsKeys.detail(agreementId) });
      }
      toast.success(response.body.message);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useAgreementBillingEmailDispatches(
  agreementId: number,
  limit = 20,
  enabled = true
) {
  return api.agreement.listBillingEmailDispatches.useQuery({
    queryKey: agreementsKeys.billingEmailDispatchesByAgreement(agreementId, limit),
    queryData: {
      params: { id: agreementId },
      query: { limit },
    },
    enabled: enabled && Boolean(agreementId),
    refetchInterval: (query) => {
      const dispatches = query.state.data?.body?.data ?? [];
      const hasRunningItems = dispatches.some(
        (item) => item.status === 'QUEUED' || item.status === 'RUNNING'
      );
      return hasRunningItems ? 5000 : false;
    },
  });
}

export function useRetryAgreementBillingEmailDispatch() {
  const queryClient = api.useQueryClient();

  return api.agreement.retryBillingEmailDispatch.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementsKeys.billingEmailDispatches() });
      toast.success('Reintento encolado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchAgreements(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListAgreementsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: agreementsKeys.list(query),
    queryFn: () => api.agreement.list.query({ query }),
  });
  return;
}
