import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import { contract } from '@/server/api/contracts';
import { env } from '@/env';
import { tsRestFetchApi } from '@ts-rest/core';

const ACCESS_TOKEN_COOKIE_NAME = 'lending_at';

/**
 * Gets the access token from cookies (server-side only)
 * On client-side, cookies are sent automatically via credentials: 'include'
 */
const getServerAccessToken = async (): Promise<string | null> => {
  if (typeof window !== 'undefined') {
    // Client-side: cookie is httpOnly, can't read it
    // Will be sent automatically via credentials: 'include'
    return null;
  }

  // Server-side: use next/headers to read cookie and pass as Bearer
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
};

/**
 * Attempts to refresh the access token using the refresh token cookie
 * Only works on client-side (server-side should not need this)
 */
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const refreshAccessToken = async (): Promise<boolean> => {
  // Prevent multiple simultaneous refresh requests
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success === true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Redirects to home page which will trigger IAM login via proxy
 */
const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    // Redirect to home, proxy will handle IAM redirect
    window.location.href = '/';
  }
};

export const api = initTsrReactQuery(contract, {
  baseUrl: env.NEXT_PUBLIC_API_URL,
  baseHeaders: {
    'x-app-source': 'ts-rest',
  },
  jsonQuery: true,
  responseValidation: true,
  credentials: 'include',
  api: async ({ headers, ...args }) => {
    // On server, pass token as Bearer header
    // On client, cookie is sent automatically
    const token = await getServerAccessToken();

    const makeRequest = () =>
      tsRestFetchApi({
        ...args,
        headers: {
          ...headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

    const response = await makeRequest();

    // On client-side, handle 401 with auto-refresh
    if (typeof window !== 'undefined' && response.status === 401) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request with new token
        return makeRequest();
      } else {
        // Refresh failed, redirect to IAM login
        redirectToLogin();
      }
    }

    return response;
  },
});
