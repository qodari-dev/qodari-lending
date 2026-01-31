import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';

// ============================================
// HANDLER
// ============================================

export const user = tsr.router(contract.user, {
  // ==========================================
  // LIST - GET /users
  // ==========================================
  list: async () => {
    try {
      return { status: 204, body: null };
    } catch (e) {
      console.log(e);
      return { status: 204, body: null };
    }
  },
});
