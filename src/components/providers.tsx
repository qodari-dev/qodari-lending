'use client';

import { useState } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { api } from '@/clients/api';

type ProvidersProps = React.PropsWithChildren;

export const Providers = ({ children }: ProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mantener datos previos mientras carga
            placeholderData: keepPreviousData,
            // Tiempo antes de considerar datos "stale"
            staleTime: 30 * 1000, // 30 segundos
            // No refetch en window focus
            refetchOnWindowFocus: false,
            // Reintentos en caso de error
            retry: 1,
            // Tiempo de cache (garbage collection)
            gcTime: 5 * 60 * 1000, // 5 minutos
          },
          mutations: {
            // Los errores se manejan en onError de cada mutation
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.ReactQueryProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors />
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </api.ReactQueryProvider>
    </QueryClientProvider>
  );
};
