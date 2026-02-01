import { AuthContext } from '@/iam/utils/get-auth-context';
import { createStore, type StoreApi } from 'zustand/vanilla';

export type AuthState = {
  auth: AuthContext | null;
  isAuthenticated: boolean;

  setAuth: (auth: AuthContext | null) => void;
  clearAuth: () => void;

  hasRole: (role: string) => boolean;
  hasPermission: (perm: string) => boolean;
  hasAnyPermission: (perms: string[]) => boolean;
};

export type AuthStore = StoreApi<AuthState>;

export function createAuthStore(initialAuth: AuthContext | null = null): AuthStore {
  return createStore<AuthState>((set, get) => ({
    auth: initialAuth,
    isAuthenticated: !!initialAuth,

    setAuth: (auth) => set({ auth, isAuthenticated: !!auth }),
    clearAuth: () => set({ auth: null, isAuthenticated: false }),

    hasRole: (role) => {
      const roles = get().auth?.roles ?? [];
      return roles.includes(role);
    },

    hasPermission: (perm) => {
      const auth = get().auth;
      if (!auth) return false;
      if (!auth.user) return false;
      if (auth.user.isAdmin) return true;
      return !!auth.permissions?.includes(perm);
    },

    hasAnyPermission: (perms) => {
      const auth = get().auth;
      if (!auth) return false;
      if (!auth.user) return false;
      if (auth.user.isAdmin) return true;
      return perms.some((p) => auth.permissions?.includes(p));
    },
  }));
}
