import { api } from '@/clients/api';
import type { ListDocumentTemplatesQuery } from '@/schemas/document-template';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const documentTemplatesKeys = {
  all: ['document-templates'] as const,

  lists: () => [...documentTemplatesKeys.all, 'list'] as const,
  list: (filters: Partial<ListDocumentTemplatesQuery> = {}) =>
    [...documentTemplatesKeys.lists(), filters] as const,

  details: () => [...documentTemplatesKeys.all, 'detail'] as const,
  detail: (id: number) => [...documentTemplatesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListDocumentTemplatesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['templateSignerRules', 'creditProductDocumentRules'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListDocumentTemplatesQuery;
  return query;
}

export function useDocumentTemplates(filters: Partial<ListDocumentTemplatesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.documentTemplate.list.useQuery({
    queryKey: documentTemplatesKeys.list(query),
    queryData: { query },
  });
}

export function useDocumentTemplate(
  id: number,
  options?: Partial<Pick<ListDocumentTemplatesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.documentTemplate.getById.useQuery({
    queryKey: documentTemplatesKeys.detail(id),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateDocumentTemplate() {
  const queryClient = api.useQueryClient();

  return api.documentTemplate.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentTemplatesKeys.lists() });
      toast.success('Plantilla creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateDocumentTemplate() {
  const queryClient = api.useQueryClient();

  return api.documentTemplate.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: documentTemplatesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentTemplatesKeys.detail(id) });
      toast.success('Plantilla actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteDocumentTemplate() {
  const queryClient = api.useQueryClient();

  return api.documentTemplate.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: documentTemplatesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentTemplatesKeys.lists() });
      toast.success('Plantilla eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchDocumentTemplates(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListDocumentTemplatesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: documentTemplatesKeys.list(query),
    queryFn: () => api.documentTemplate.list.query({ query }),
  });
  return;
}
