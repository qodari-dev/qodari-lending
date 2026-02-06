import { api } from '@/clients/api';
import type { ListIamUsersQuery } from '@/schemas/iam-user';

export const iamUserKeys = {
  all: ['iam-users'] as const,

  lists: () => [...iamUserKeys.all, 'list'] as const,
  list: (filters: Partial<ListIamUsersQuery> = {}) => [...iamUserKeys.lists(), filters] as const,

  details: () => [...iamUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...iamUserKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListIamUsersQuery>) {
  return {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 200,
    search: filters?.search,
  } as ListIamUsersQuery;
}

export function useIamUsers(filters: Partial<ListIamUsersQuery> = {}) {
  const query = defaultQuery(filters);

  return api.iamUser.list.useQuery({
    queryKey: iamUserKeys.list(query),
    queryData: { query },
  });
}

export function useIamUser(id: string, enabled = true) {
  return api.iamUser.getById.useQuery({
    queryKey: iamUserKeys.detail(id),
    queryData: {
      params: { id },
    },
    enabled: enabled && !!id,
  });
}
