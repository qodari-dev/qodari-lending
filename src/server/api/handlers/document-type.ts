import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
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
      const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }
      return { status: 200, body: null };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar informacion',
      });
    }
  },
});
