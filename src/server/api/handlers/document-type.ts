import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';

// ============================================
// HANDLER
// ============================================

export const documentType = tsr.router(contract.documentType, {
  // ==========================================
  // LIST - GET /document-types
  // ==========================================
  list: async ({}, { request, appRoute }) => {
    try {
      // Validates auth and permissions (throws 401/403 if invalid)
      // ctx is undefined only for public routes, this route requires auth
      const ctx = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      // TODO: Use ctx.accountId to filter data, ctx.permissions for fine-grained access
      console.log('Authenticated:', ctx?.type, ctx?.accountId);

      return { status: 200, body: [] };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar informacion',
      });
    }
  },
});
