import { api } from '@/clients/api';
import type { ListLoanApprovalLevelsQuery } from '@/schemas/loan-approval-level';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const loanApprovalLevelsKeys = {
  all: ['loan-approval-levels'] as const,

  lists: () => [...loanApprovalLevelsKeys.all, 'list'] as const,
  list: (filters: Partial<ListLoanApprovalLevelsQuery> = {}) =>
    [...loanApprovalLevelsKeys.lists(), filters] as const,

  details: () => [...loanApprovalLevelsKeys.all, 'detail'] as const,
  detail: (id: number) => [...loanApprovalLevelsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListLoanApprovalLevelsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['users'],
    sort: filters?.sort ?? [{ field: 'levelOrder', order: 'asc' }],
    where: filters?.where,
    search: filters?.search,
  } as ListLoanApprovalLevelsQuery;
  return query;
}

export function useLoanApprovalLevels(filters: Partial<ListLoanApprovalLevelsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.loanApprovalLevel.list.useQuery({
    queryKey: loanApprovalLevelsKeys.list(query),
    queryData: { query },
  });
}

export function useLoanApprovalLevel(
  id: number,
  options?: Partial<Pick<ListLoanApprovalLevelsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.loanApprovalLevel.getById.useQuery({
    queryKey: loanApprovalLevelsKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateLoanApprovalLevel() {
  const queryClient = api.useQueryClient();

  return api.loanApprovalLevel.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanApprovalLevelsKeys.lists() });
      toast.success('Nivel de aprobacion creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateLoanApprovalLevel() {
  const queryClient = api.useQueryClient();

  return api.loanApprovalLevel.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: loanApprovalLevelsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanApprovalLevelsKeys.detail(id) });
      toast.success('Nivel de aprobacion actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteLoanApprovalLevel() {
  const queryClient = api.useQueryClient();

  return api.loanApprovalLevel.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: loanApprovalLevelsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: loanApprovalLevelsKeys.lists() });
      toast.success('Nivel de aprobacion eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchLoanApprovalLevels(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListLoanApprovalLevelsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: loanApprovalLevelsKeys.list(query),
    queryFn: () => api.loanApprovalLevel.list.query({ query }),
  });
  return;
}
