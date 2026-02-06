import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  paymentReceiptMovementTypeLabels,
  PaymentReceiptMovementType,
  PaymentReceiptType,
} from '@/schemas/payment-receipt-type';
import { formatDate } from '@/utils/formatters';

export function PaymentReceiptTypeInfo({
  paymentReceiptType,
  opened,
  onOpened,
}: {
  paymentReceiptType: PaymentReceiptType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!paymentReceiptType) return null;

  const users = paymentReceiptType.userPaymentReceiptTypes ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: paymentReceiptType.name },
        {
          label: 'Movimiento',
          value:
            paymentReceiptMovementTypeLabels[
              paymentReceiptType.movementType as PaymentReceiptMovementType
            ] ?? paymentReceiptType.movementType,
        },
        {
          label: 'Cuenta',
          value: paymentReceiptType.glAccount
            ? `${paymentReceiptType.glAccount.code} - ${paymentReceiptType.glAccount.name}`
            : paymentReceiptType.glAccountId,
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={paymentReceiptType.isActive ? 'default' : 'outline'}>
              {paymentReceiptType.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(paymentReceiptType.createdAt) },
        { label: 'Actualizado', value: formatDate(paymentReceiptType.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <DescriptionList sections={sections} columns={2} />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Usuarios</h3>
            {users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell>
                        <Badge variant={user.isDefault ? 'default' : 'outline'}>
                          {user.isDefault ? 'Si' : 'No'}
                        </Badge>
                      </TableCell>
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
