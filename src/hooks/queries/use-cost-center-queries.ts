import { api } from '@/clients/api';
import type { ListCostCentersQuery } from '@/schemas/cost-center';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const costCentersKeys = {
  all: ['cost-centers'] as const,

  lists: () => [...costCentersKeys.all, 'list'] as const,
  list: (filters: Partial<ListCostCentersQuery> = {}) =>
    [...costCentersKeys.lists(), filters] as const,

  details: () => [...costCentersKeys.all, 'detail'] as const,
  detail: (id: number) => [...costCentersKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListCostCentersQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListCostCentersQuery;
  return query;
}

export function useCostCenters(filters: Partial<ListCostCentersQuery> = {}) {
  const query = defaultQuery(filters);

  return api.costCenter.list.useQuery({
    queryKey: costCentersKeys.list(query),
    queryData: { query },
  });
}

export function useCostCenter(
  id: number,
  options?: Partial<Pick<ListCostCentersQuery, 'include'>> & { enabled?: boolean }
) {
  return api.costCenter.getById.useQuery({
    queryKey: costCentersKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateCostCenter() {
  const queryClient = api.useQueryClient();

  return api.costCenter.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costCentersKeys.lists() });
      toast.success('Centro de costo creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateCostCenter() {
  const queryClient = api.useQueryClient();

  return api.costCenter.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: costCentersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: costCentersKeys.detail(id) });
      toast.success('Centro de costo actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteCostCenter() {
  const queryClient = api.useQueryClient();

  return api.costCenter.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: costCentersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: costCentersKeys.lists() });
      toast.success('Centro de costo eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchCostCenters(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListCostCentersQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: costCentersKeys.list(query),
    queryFn: () => api.costCenter.list.query({ query }),
  });
  return;
}
