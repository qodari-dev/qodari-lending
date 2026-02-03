import { api } from '@/clients/api';
import type { ListRejectionReasonsQuery } from '@/schemas/rejection-reason';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const rejectionReasonsKeys = {
  all: ['rejection-reasons'] as const,

  lists: () => [...rejectionReasonsKeys.all, 'list'] as const,
  list: (filters: Partial<ListRejectionReasonsQuery> = {}) =>
    [...rejectionReasonsKeys.lists(), filters] as const,

  details: () => [...rejectionReasonsKeys.all, 'detail'] as const,
  detail: (id: number) => [...rejectionReasonsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListRejectionReasonsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListRejectionReasonsQuery;
  return query;
}

export function useRejectionReasons(filters: Partial<ListRejectionReasonsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.rejectionReason.list.useQuery({
    queryKey: rejectionReasonsKeys.list(query),
    queryData: { query },
  });
}

export function useRejectionReason(
  id: number,
  options?: Partial<Pick<ListRejectionReasonsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.rejectionReason.getById.useQuery({
    queryKey: rejectionReasonsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateRejectionReason() {
  const queryClient = api.useQueryClient();

  return api.rejectionReason.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rejectionReasonsKeys.lists() });
      toast.success('Motivo de rechazo creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateRejectionReason() {
  const queryClient = api.useQueryClient();

  return api.rejectionReason.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: rejectionReasonsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: rejectionReasonsKeys.detail(id) });
      toast.success('Motivo de rechazo actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteRejectionReason() {
  const queryClient = api.useQueryClient();

  return api.rejectionReason.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: rejectionReasonsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: rejectionReasonsKeys.lists() });
      toast.success('Motivo de rechazo eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchRejectionReasons(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListRejectionReasonsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: rejectionReasonsKeys.list(query),
    queryFn: () => api.rejectionReason.list.query({ query }),
  });
  return;
}
