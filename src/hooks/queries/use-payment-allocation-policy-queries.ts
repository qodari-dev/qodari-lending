import { api } from '@/clients/api';
import type { ListPaymentAllocationPoliciesQuery } from '@/schemas/payment-allocation-policy';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const paymentAllocationPoliciesKeys = {
  all: ['payment-allocation-policies'] as const,

  lists: () => [...paymentAllocationPoliciesKeys.all, 'list'] as const,
  list: (filters: Partial<ListPaymentAllocationPoliciesQuery> = {}) =>
    [...paymentAllocationPoliciesKeys.lists(), filters] as const,

  details: () => [...paymentAllocationPoliciesKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentAllocationPoliciesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListPaymentAllocationPoliciesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['paymentAllocationPolicyRules'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListPaymentAllocationPoliciesQuery;
  return query;
}

export function usePaymentAllocationPolicies(
  filters: Partial<ListPaymentAllocationPoliciesQuery> = {}
) {
  const query = defaultQuery(filters);

  return api.paymentAllocationPolicy.list.useQuery({
    queryKey: paymentAllocationPoliciesKeys.list(query),
    queryData: { query },
  });
}

export function usePaymentAllocationPolicy(
  id: number,
  options?: Partial<Pick<ListPaymentAllocationPoliciesQuery, 'include'>> & {
    enabled?: boolean;
  }
) {
  return api.paymentAllocationPolicy.getById.useQuery({
    queryKey: paymentAllocationPoliciesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreatePaymentAllocationPolicy() {
  const queryClient = api.useQueryClient();

  return api.paymentAllocationPolicy.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAllocationPoliciesKeys.lists() });
      toast.success('Politica de aplicacion creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdatePaymentAllocationPolicy() {
  const queryClient = api.useQueryClient();

  return api.paymentAllocationPolicy.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: paymentAllocationPoliciesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentAllocationPoliciesKeys.detail(id) });
      toast.success('Politica de aplicacion actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeletePaymentAllocationPolicy() {
  const queryClient = api.useQueryClient();

  return api.paymentAllocationPolicy.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: paymentAllocationPoliciesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentAllocationPoliciesKeys.lists() });
      toast.success('Politica de aplicacion eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchPaymentAllocationPolicies(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListPaymentAllocationPoliciesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: paymentAllocationPoliciesKeys.list(query),
    queryFn: () => api.paymentAllocationPolicy.list.query({ query }),
  });
  return;
}
