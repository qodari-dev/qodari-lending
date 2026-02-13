'use client';

import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useUpdateLoanPaymentAgreement } from '@/hooks/queries/use-loan-queries';
import { cn } from '@/lib/utils';
import { Loan } from '@/schemas/loan';
import { formatDateOnly } from '@/utils/formatters';
import { toast } from 'sonner';

function parseCalendarDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? date : undefined;
}

export function LoanPaymentAgreementDialog({
  loan,
  opened,
  onOpened,
}: {
  loan: Loan | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { mutateAsync: updatePaymentAgreement, isPending } = useUpdateLoanPaymentAgreement();

  if (!loan) return null;

  const initialHasPaymentAgreement = Boolean(loan.hasPaymentAgreement);
  const initialPaymentAgreementDate = parseCalendarDate(loan.paymentAgreementDate);

  return (
    <Dialog open={opened} onOpenChange={onOpened}>
      <DialogContent
        key={`${loan.id}:${loan.hasPaymentAgreement ? '1' : '0'}:${loan.paymentAgreementDate ?? ''}`}
        className="sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Acuerdo de pago</DialogTitle>
          <DialogDescription>
            Actualice el estado de acuerdo de pago del credito <strong>{loan.creditNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <LoanPaymentAgreementForm
          initialHasPaymentAgreement={initialHasPaymentAgreement}
          initialPaymentAgreementDate={initialPaymentAgreementDate}
          isPending={isPending}
          onSubmit={async (values) => {
            await updatePaymentAgreement({
              params: { id: loan.id },
              body: values,
            });
            onOpened(false);
          }}
          onCancel={() => onOpened(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function LoanPaymentAgreementForm({
  initialHasPaymentAgreement,
  initialPaymentAgreementDate,
  isPending,
  onSubmit,
  onCancel,
}: {
  initialHasPaymentAgreement: boolean;
  initialPaymentAgreementDate: Date | undefined;
  isPending: boolean;
  onSubmit(values: { hasPaymentAgreement: boolean; paymentAgreementDate: Date | null }): Promise<void>;
  onCancel(): void;
}) {
  const [hasPaymentAgreement, setHasPaymentAgreement] = useState(initialHasPaymentAgreement);
  const [paymentAgreementDate, setPaymentAgreementDate] = useState<Date | undefined>(
    initialPaymentAgreementDate
  );

  const currentDateValue = formatDateOnly(initialPaymentAgreementDate);
  const nextDateValue = formatDateOnly(paymentAgreementDate);
  const hasChanges =
    hasPaymentAgreement !== initialHasPaymentAgreement || nextDateValue !== currentDateValue;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Tiene acuerdo de pago</p>
          <p className="text-muted-foreground text-xs">
            Marque para indicar que el credito tiene acuerdo de pago activo.
          </p>
        </div>
        <Switch
          checked={hasPaymentAgreement}
          onCheckedChange={(checked) => {
            setHasPaymentAgreement(checked);
            if (!checked) {
              setPaymentAgreementDate(undefined);
            }
          }}
          disabled={isPending}
        />
      </div>

      {hasPaymentAgreement ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fecha acuerdo de pago</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'w-[260px] justify-start text-left font-normal',
                  !paymentAgreementDate && 'text-muted-foreground'
                )}
                disabled={isPending}
              >
                <CalendarIcon className="mr-2 size-4" />
                {paymentAgreementDate ? format(paymentAgreementDate, 'PPP') : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={paymentAgreementDate}
                onSelect={(value) => setPaymentAgreementDate(value ?? undefined)}
                captionLayout="dropdown"
              />
            </PopoverContent>
          </Popover>
          {!paymentAgreementDate ? (
            <p className="text-destructive text-xs">Debe seleccionar una fecha.</p>
          ) : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={isPending || !hasChanges || (hasPaymentAgreement && !paymentAgreementDate)}
          onClick={async () => {
            if (hasPaymentAgreement && !paymentAgreementDate) {
              toast.error('Debe seleccionar la fecha del acuerdo de pago');
              return;
            }

            await onSubmit({
              hasPaymentAgreement,
              paymentAgreementDate: hasPaymentAgreement ? paymentAgreementDate ?? null : null,
            });
          }}
        >
          {isPending ? <Spinner /> : null}
          Guardar
        </Button>
      </DialogFooter>
    </div>
  );
}
