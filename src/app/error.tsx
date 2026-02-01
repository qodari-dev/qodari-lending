'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Opcional: Log a servicio de monitoreo (Sentry, etc.)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-100 w-full flex-col items-center justify-center gap-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-destructive/10 rounded-full p-4">
          <AlertCircle className="text-destructive h-10 w-10" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Algo salió mal</h2>
          <p className="text-muted-foreground max-w-md">
            Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <code className="bg-muted text-destructive mt-2 rounded px-2 py-1 text-sm">
              {error.message}
            </code>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Intentar de nuevo
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Ir al inicio
          </Link>
        </Button>
      </div>

      {error.digest && <p className="text-muted-foreground text-xs">Error ID: {error.digest}</p>}
    </div>
  );
}
