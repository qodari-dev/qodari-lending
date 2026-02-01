import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'No autorizado',
};

export default async function UnauthorizedPage() {
  return (
    <div className="flex min-h-[calc(100vh-0px)] w-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Acceso no autorizado</CardTitle>
          <p className="text-muted-foreground text-sm">
            No tienes permisos para ver esta página. Si crees que es un error, contacta al
            administrador.
          </p>
        </CardHeader>

        <CardContent>
          <div className="bg-muted/30 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="bg-background mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold">
                401
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Recurso protegido</p>
                <p className="text-muted-foreground text-sm">
                  Tu sesión puede haber expirado o tu cuenta no tiene acceso a este módulo.
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="secondary">
            <Link href={`/`}>Ir al Home</Link>
          </Button>
          <Button asChild>
            <Link href={`/login`}>Iniciar sesión</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
