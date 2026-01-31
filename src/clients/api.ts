import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import { contract } from '@/server/api/contracts';
import { env } from '@/env';
import { tsRestFetchApi } from '@ts-rest/core';

const setIsomorphicHeaders = async (
  extraHeaders: Record<string, string> = {}
): Promise<typeof extraHeaders> => {
  if (typeof window !== 'undefined') {
    return extraHeaders;
  }

  const { headers } = await import('next/headers');
  const headersList = await headers();
  return {
    ...extraHeaders,
    cookie: headersList.get('cookie') ?? '',
  };
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
    const h = await setIsomorphicHeaders(headers);
    return tsRestFetchApi({
      ...args,
      headers: { ...headers, ...h },
      credentials: 'include',
    });
  },
});
