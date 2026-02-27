import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoanApprovalLevel } from '@/schemas/loan-approval-level';
import { formatCurrency, formatDate } from '@/utils/formatters';

export function LoanApprovalLevelInfo({
  loanApprovalLevel,
  opened,
  onOpened,
}: {
  loanApprovalLevel: LoanApprovalLevel | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!loanApprovalLevel) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: loanApprovalLevel.name },
        { label: 'Orden nivel', value: loanApprovalLevel.levelOrder },
        {
          label: 'Tope monto',
          value:
            loanApprovalLevel.maxApprovalAmount === null
              ? 'Sin tope'
              : formatCurrency(loanApprovalLevel.maxApprovalAmount),
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={loanApprovalLevel.isActive ? 'default' : 'outline'}>
              {loanApprovalLevel.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(loanApprovalLevel.createdAt) },
        { label: 'Actualizado', value: formatDate(loanApprovalLevel.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Nivel de aprobacion</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <DescriptionList sections={sections} columns={2} />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Usuarios del nivel</h3>
            {loanApprovalLevel.users?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Activo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanApprovalLevel.users.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.userId}</TableCell>
                      <TableCell>{row.userName}</TableCell>
                      <TableCell>{row.sortOrder}</TableCell>
                      <TableCell>{row.isActive ? 'Si' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                No hay usuarios configurados.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
