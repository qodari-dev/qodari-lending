import { api } from '@/clients/api';
import type { ListBillingEmailTemplatesQuery } from '@/schemas/billing-email-template';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const billingEmailTemplatesKeys = {
  all: ['billing-email-templates'] as const,

  lists: () => [...billingEmailTemplatesKeys.all, 'list'] as const,
  list: (filters: Partial<ListBillingEmailTemplatesQuery> = {}) =>
    [...billingEmailTemplatesKeys.lists(), filters] as const,

  details: () => [...billingEmailTemplatesKeys.all, 'detail'] as const,
  detail: (id: number) => [...billingEmailTemplatesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListBillingEmailTemplatesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListBillingEmailTemplatesQuery;
  return query;
}

export function useBillingEmailTemplates(filters: Partial<ListBillingEmailTemplatesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.billingEmailTemplate.list.useQuery({
    queryKey: billingEmailTemplatesKeys.list(query),
    queryData: { query },
  });
}

export function useBillingEmailTemplate(
  id: number,
  options?: Partial<Pick<ListBillingEmailTemplatesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.billingEmailTemplate.getById.useQuery({
    queryKey: billingEmailTemplatesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateBillingEmailTemplate() {
  const queryClient = api.useQueryClient();

  return api.billingEmailTemplate.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingEmailTemplatesKeys.lists() });
      toast.success('Plantilla creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateBillingEmailTemplate() {
  const queryClient = api.useQueryClient();

  return api.billingEmailTemplate.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: billingEmailTemplatesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billingEmailTemplatesKeys.detail(id) });
      toast.success('Plantilla actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteBillingEmailTemplate() {
  const queryClient = api.useQueryClient();

  return api.billingEmailTemplate.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: billingEmailTemplatesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: billingEmailTemplatesKeys.lists() });
      toast.success('Plantilla eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchBillingEmailTemplates(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListBillingEmailTemplatesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: billingEmailTemplatesKeys.list(query),
    queryFn: () => api.billingEmailTemplate.list.query({ query }),
  });
  return;
}
