import { api } from '@/clients/api';
import type { ListInsuranceCompaniesQuery } from '@/schemas/insurance-company';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const insuranceCompaniesKeys = {
  all: ['insurance-companies'] as const,

  lists: () => [...insuranceCompaniesKeys.all, 'list'] as const,
  list: (filters: Partial<ListInsuranceCompaniesQuery> = {}) =>
    [...insuranceCompaniesKeys.lists(), filters] as const,

  details: () => [...insuranceCompaniesKeys.all, 'detail'] as const,
  detail: (id: number) => [...insuranceCompaniesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListInsuranceCompaniesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['insuranceRateRanges'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListInsuranceCompaniesQuery;
  return query;
}

export function useInsuranceCompanies(filters: Partial<ListInsuranceCompaniesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.insuranceCompany.list.useQuery({
    queryKey: insuranceCompaniesKeys.list(query),
    queryData: { query },
  });
}

export function useInsuranceCompany(
  id: number,
  options?: Partial<Pick<ListInsuranceCompaniesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.insuranceCompany.getById.useQuery({
    queryKey: insuranceCompaniesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateInsuranceCompany() {
  const queryClient = api.useQueryClient();

  return api.insuranceCompany.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceCompaniesKeys.lists() });
      toast.success('Empresa de seguros creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateInsuranceCompany() {
  const queryClient = api.useQueryClient();

  return api.insuranceCompany.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: insuranceCompaniesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: insuranceCompaniesKeys.detail(id) });
      toast.success('Empresa de seguros actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteInsuranceCompany() {
  const queryClient = api.useQueryClient();

  return api.insuranceCompany.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: insuranceCompaniesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: insuranceCompaniesKeys.lists() });
      toast.success('Empresa de seguros eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchInsuranceCompanies(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListInsuranceCompaniesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: insuranceCompaniesKeys.list(query),
    queryFn: () => api.insuranceCompany.list.query({ query }),
  });
  return;
}
