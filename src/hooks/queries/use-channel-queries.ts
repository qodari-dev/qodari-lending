import { api } from '@/clients/api';
import type { ListChannelsQuery } from '@/schemas/channel';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const channelsKeys = {
  all: ['channels'] as const,

  lists: () => [...channelsKeys.all, 'list'] as const,
  list: (filters: Partial<ListChannelsQuery> = {}) =>
    [...channelsKeys.lists(), filters] as const,

  details: () => [...channelsKeys.all, 'detail'] as const,
  detail: (id: number) => [...channelsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListChannelsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListChannelsQuery;
  return query;
}

export function useChannels(filters: Partial<ListChannelsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.channel.list.useQuery({
    queryKey: channelsKeys.list(query),
    queryData: { query },
  });
}

export function useChannel(
  id: number,
  options?: Partial<Pick<ListChannelsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.channel.getById.useQuery({
    queryKey: channelsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateChannel() {
  const queryClient = api.useQueryClient();

  return api.channel.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelsKeys.lists() });
      toast.success('Canal creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateChannel() {
  const queryClient = api.useQueryClient();

  return api.channel.update.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.invalidateQueries({ queryKey: channelsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: channelsKeys.detail(id) });
      toast.success('Canal actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteChannel() {
  const queryClient = api.useQueryClient();

  return api.channel.delete.useMutation({
    onSuccess: (_, variables) => {
      const id = variables.params.id as number;
      queryClient.removeQueries({ queryKey: channelsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: channelsKeys.lists() });
      toast.success('Canal eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchChannels(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListChannelsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: channelsKeys.list(query),
    queryFn: () => api.channel.list.query({ query }),
  });
  return;
}
