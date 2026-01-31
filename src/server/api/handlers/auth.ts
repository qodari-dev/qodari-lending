import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';

export const auth = tsr.router(contract.auth, {
  // --------------------------------------
  // POST - /logout
  // --------------------------------------
  logout: async () => {
    try {
      return {
        status: 204,
        body: undefined,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Something went wrong querying applications.',
        logPrefix: '[auth.logout]',
      });
    }
  },
});
