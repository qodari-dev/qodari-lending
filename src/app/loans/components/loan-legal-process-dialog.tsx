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
import { useUpdateLoanLegalProcess } from '@/hooks/queries/use-loan-queries';
import { cn } from '@/lib/utils';
import { Loan } from '@/schemas/loan';
import { formatDateOnly } from '@/utils/formatters';
import { toast } from 'sonner';

function parseCalendarDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? date : undefined;
}

export function LoanLegalProcessDialog({
  loan,
  opened,
  onOpened,
}: {
  loan: Loan | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { mutateAsync: updateLegalProcess, isPending } = useUpdateLoanLegalProcess();

  if (!loan) return null;

  const initialHasLegalProcess = Boolean(loan.hasLegalProcess);
  const initialLegalProcessDate = parseCalendarDate(loan.legalProcessDate);

  return (
    <Dialog open={opened} onOpenChange={onOpened}>
      <DialogContent
        key={`${loan.id}:${loan.hasLegalProcess ? '1' : '0'}:${loan.legalProcessDate ?? ''}`}
        className="sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Proceso juridico</DialogTitle>
          <DialogDescription>
            Actualice el estado de envio a juridica del credito <strong>{loan.creditNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <LoanLegalProcessForm
          initialHasLegalProcess={initialHasLegalProcess}
          initialLegalProcessDate={initialLegalProcessDate}
          isPending={isPending}
          onSubmit={async (values) => {
            await updateLegalProcess({
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

function LoanLegalProcessForm({
  initialHasLegalProcess,
  initialLegalProcessDate,
  isPending,
  onSubmit,
  onCancel,
}: {
  initialHasLegalProcess: boolean;
  initialLegalProcessDate: Date | undefined;
  isPending: boolean;
  onSubmit(values: { hasLegalProcess: boolean; legalProcessDate: Date | null }): Promise<void>;
  onCancel(): void;
}) {
  const [hasLegalProcess, setHasLegalProcess] = useState(initialHasLegalProcess);
  const [legalProcessDate, setLegalProcessDate] = useState<Date | undefined>(initialLegalProcessDate);

  const currentDateValue = formatDateOnly(initialLegalProcessDate);
  const nextDateValue = formatDateOnly(legalProcessDate);
  const hasChanges = hasLegalProcess !== initialHasLegalProcess || nextDateValue !== currentDateValue;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Enviar a juridica</p>
          <p className="text-muted-foreground text-xs">Marque para indicar que el credito ya fue enviado.</p>
        </div>
        <Switch
          checked={hasLegalProcess}
          onCheckedChange={(checked) => {
            setHasLegalProcess(checked);
            if (!checked) {
              setLegalProcessDate(undefined);
            }
          }}
          disabled={isPending}
        />
      </div>

      {hasLegalProcess ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fecha envio juridica</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'w-[260px] justify-start text-left font-normal',
                  !legalProcessDate && 'text-muted-foreground'
                )}
                disabled={isPending}
              >
                <CalendarIcon className="mr-2 size-4" />
                {legalProcessDate ? format(legalProcessDate, 'PPP') : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={legalProcessDate}
                onSelect={(value) => setLegalProcessDate(value ?? undefined)}
                captionLayout="dropdown"
              />
            </PopoverContent>
          </Popover>
          {!legalProcessDate ? (
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
          disabled={isPending || !hasChanges || (hasLegalProcess && !legalProcessDate)}
          onClick={async () => {
            if (hasLegalProcess && !legalProcessDate) {
              toast.error('Debe seleccionar la fecha de envio a juridica');
              return;
            }

            await onSubmit({
              hasLegalProcess,
              legalProcessDate: hasLegalProcess ? legalProcessDate ?? null : null,
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
