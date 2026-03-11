'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLoanApplicationApprovalLoad } from '@/hooks/queries/use-loan-application-queries';
import { useLoanApprovalLevels } from '@/hooks/queries/use-loan-approval-level-queries';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/formatters';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

function formatMoney(value: number): string {
  return formatCurrency(value, {
    currency: 'COP',
    locale: 'es-CO',
    decimals: 0,
  });
}

export function LoanApplicationApprovalLoadSheet({
  opened,
  onOpened,
}: {
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { data: levelsData, isLoading: isLoadingLevels } = useLoanApprovalLevels({
    page: 1,
    limit: 100,
    sort: [{ field: 'levelOrder', order: 'asc' }],
    include: ['users'],
  });

  const levels = React.useMemo(() => levelsData?.body?.data ?? [], [levelsData]);
  const [selectedLevelId, setSelectedLevelId] = React.useState<number | undefined>();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!opened) return;
    if (!levels.length) {
      setSelectedLevelId(undefined);
      return;
    }

    setSelectedLevelId((current) => {
      if (current && levels.some((level) => level.id === current)) return current;
      return levels[0]?.id;
    });
  }, [levels, opened]);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useLoanApplicationApprovalLoad(selectedLevelId, {
    enabled: opened && !!selectedLevelId,
  });

  const load = data?.body;

  React.useEffect(() => {
    if (!load?.users.length) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId((current) => {
      if (current && load.users.some((user) => user.userId === current)) return current;
      return load.users.find((user) => user.pendingCount > 0)?.userId ?? load.users[0]?.userId ?? null;
    });
  }, [load]);

  const selectedUser = React.useMemo(
    () => load?.users.find((user) => user.userId === selectedUserId) ?? null,
    [load, selectedUserId]
  );

  const usersWithPending = React.useMemo(
    () => load?.users.filter((user) => user.pendingCount > 0).length ?? 0,
    [load]
  );

  const maxPendingDays = React.useMemo(
    () => load?.users.reduce((max, user) => Math.max(max, user.oldestPendingDays), 0) ?? 0,
    [load]
  );

  const maxCreatedDays = React.useMemo(
    () => load?.users.reduce((max, user) => Math.max(max, user.oldestCreatedDays), 0) ?? 0,
    [load]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-auto sm:max-w-6xl">
        <SheetHeader>
          <SheetTitle>Carga de aprobadores</SheetTitle>
          <SheetDescription>
            Revise la distribucion de pendientes por nivel de aprobacion.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-sm">
              <label className="mb-2 block text-sm font-medium">Nivel de aprobacion</label>
              <Select
                value={selectedLevelId ? String(selectedLevelId) : ''}
                onValueChange={(value) => {
                  const parsed = Number(value);
                  setSelectedLevelId(Number.isFinite(parsed) ? parsed : undefined);
                  setSelectedUserId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingLevels ? 'Cargando niveles...' : 'Seleccione un nivel'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.id} value={String(level.id)}>
                      Nivel {level.levelOrder} - {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={!selectedLevelId || isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {!selectedLevelId && !isLoadingLevels ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sin niveles configurados</AlertTitle>
              <AlertDescription>
                No hay niveles de aprobacion disponibles para consultar carga.
              </AlertDescription>
            </Alert>
          ) : null}

          {selectedLevelId && isLoading ? (
            <Card>
              <CardContent className="flex items-center gap-2 py-8 text-sm">
                <Spinner />
                Cargando carga del nivel...
              </CardContent>
            </Card>
          ) : null}

          {isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error al consultar carga</AlertTitle>
              <AlertDescription>{getTsRestErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}

          {load ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Nivel {load.levelOrder}</Badge>
                <Badge variant="secondary">{load.levelName}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">
                      {formatNumber(load.users.length, 0)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    Usuarios activos en el nivel
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">
                      {formatNumber(load.totalPendingCount, 0)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    Solicitudes pendientes del nivel
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">
                      {formatNumber(usersWithPending, 0)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    Usuarios con carga activa
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">{formatNumber(maxPendingDays, 0)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    Mayor tiempo en cola del nivel
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">{formatNumber(maxCreatedDays, 0)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    Mayor antiguedad total del nivel
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Distribucion por usuario</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead className="text-right">Pendientes</TableHead>
                        <TableHead>Asignacion mas antigua</TableHead>
                        <TableHead className="text-right">Mayor cola</TableHead>
                        <TableHead className="text-right">Mayor antiguedad</TableHead>
                        <TableHead className="text-right">Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {load.users.length ? (
                        load.users.map((user) => {
                          const isSelected = user.userId === selectedUserId;

                          return (
                            <TableRow key={user.userId}>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{user.userName}</span>
                                  {user.pendingCount === 0 ? (
                                    <Badge variant="outline">Libre</Badge>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatNumber(user.pendingCount, 0)}
                              </TableCell>
                              <TableCell>
                                {user.oldestAssignedAt ? formatDateTime(user.oldestAssignedAt) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {user.pendingCount ? `${user.oldestPendingDays} dias` : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {user.pendingCount ? `${user.oldestCreatedDays} dias` : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant={isSelected ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={() =>
                                    setSelectedUserId((current) =>
                                      current === user.userId ? null : user.userId
                                    )
                                  }
                                >
                                  {isSelected ? 'Ocultar' : 'Ver detalle'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground text-center">
                            No hay usuarios configurados para este nivel
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {selectedUser ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Detalle de {selectedUser.userName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead># Credito</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Fecha solicitud</TableHead>
                          <TableHead>Fecha asignado</TableHead>
                          <TableHead className="text-right">Dias en cola</TableHead>
                          <TableHead className="text-right">Dias desde creacion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUser.applications.length ? (
                          selectedUser.applications.map((item) => (
                            <TableRow key={item.loanApplicationId}>
                              <TableCell>{item.creditNumber}</TableCell>
                              <TableCell className="text-right">
                                {formatMoney(item.requestedAmount)}
                              </TableCell>
                              <TableCell>{formatDate(item.applicationDate)}</TableCell>
                              <TableCell>
                                {item.assignedAt ? formatDateTime(item.assignedAt) : '-'}
                              </TableCell>
                              <TableCell className="text-right">{item.pendingDays} dias</TableCell>
                              <TableCell className="text-right">{item.createdDays} dias</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-muted-foreground text-center">
                              Este usuario no tiene pendientes en este nivel
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
