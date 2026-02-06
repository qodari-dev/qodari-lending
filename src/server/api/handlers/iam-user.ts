import { iamClient } from '@/iam/clients/iam-m2m-client';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';

const toIamUser = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended';
  isAdmin: boolean;
}) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  displayName: `${user.firstName} ${user.lastName}`.trim() || user.email,
  status: user.status,
  isAdmin: user.isAdmin,
});

export const iamUser = tsr.router(contract.iamUser, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const result = await iamClient.listUsers({
        page: query.page,
        limit: query.limit,
        search: query.search,
      });

      return {
        status: 200 as const,
        body: {
          data: result.data.map(toIamUser),
          meta: result.meta,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar usuarios de IAM',
      });
    }
  },
  getById: async ({ params: { id } }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const user = await iamClient.getUserById(id);

      return {
        status: 200 as const,
        body: toIamUser(user),
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener usuario de IAM ${id}`,
      });
    }
  },
});
