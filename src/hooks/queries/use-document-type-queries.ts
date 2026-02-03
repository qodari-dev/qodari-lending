import { api } from '@/clients/api';
import type { ListDocumentTypesQuery } from '@/schemas/document-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const documentTypesKeys = {
  all: ['document-types'] as const,

  lists: () => [...documentTypesKeys.all, 'list'] as const,
  list: (filters: Partial<ListDocumentTypesQuery> = {}) =>
    [...documentTypesKeys.lists(), filters] as const,

  details: () => [...documentTypesKeys.all, 'detail'] as const,
  detail: (id: number) => [...documentTypesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListDocumentTypesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListDocumentTypesQuery;
  return query;
}

export function useDocumentTypes(filters: Partial<ListDocumentTypesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.documentType.list.useQuery({
    queryKey: documentTypesKeys.list(query),
    queryData: { query },
  });
}

export function useDocumentType(
  id: number,
  options?: Partial<Pick<ListDocumentTypesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.documentType.getById.useQuery({
    queryKey: documentTypesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateDocumentType() {
  const queryClient = api.useQueryClient();

  return api.documentType.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentTypesKeys.lists() });
      toast.success('Documento creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateDocumentType() {
  const queryClient = api.useQueryClient();

  return api.documentType.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: documentTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentTypesKeys.detail(id) });
      toast.success('Documento actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteDocumentType() {
  const queryClient = api.useQueryClient();

  return api.documentType.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: documentTypesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentTypesKeys.lists() });
      toast.success('Documento eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchDocumentTypes(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListDocumentTypesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: documentTypesKeys.list(query),
    queryFn: () => api.documentType.list.query({ query }),
  });
  return;
}
