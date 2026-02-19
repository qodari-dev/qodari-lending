'use client';

import { useMemo, useState } from 'react';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAgreements } from '@/hooks/queries/use-agreement-queries';
import { useUpdateLoanAgreement } from '@/hooks/queries/use-loan-queries';
import { Loan } from '@/schemas/loan';
import { ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';

type AgreementOption = {
  id: number;
  agreementCode: string;
  businessName: string;
};

export function LoanAgreementDialog({
  loan,
  opened,
  onOpened,
}: {
  loan: Loan | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { mutateAsync: updateAgreement, isPending } = useUpdateLoanAgreement();
  const { data: agreementsData } = useAgreements({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'businessName', order: 'asc' }],
  });
  const agreements = useMemo(() => agreementsData?.body?.data ?? [], [agreementsData]);

  if (!loan) return null;

  return (
    <Dialog open={opened} onOpenChange={onOpened}>
      <DialogContent key={`${loan.id}:${loan.agreementId ?? 'none'}`} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cambiar convenio</DialogTitle>
          <DialogDescription>
            Actualice el convenio del credito <strong>{loan.creditNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <LoanAgreementForm
          agreements={agreements}
          initialAgreementId={loan.agreementId ?? undefined}
          isPending={isPending}
          onSubmit={async (agreementId) => {
            await updateAgreement({
              params: { id: loan.id },
              body: { agreementId },
            });
            onOpened(false);
          }}
          onCancel={() => onOpened(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function LoanAgreementForm({
  agreements,
  initialAgreementId,
  isPending,
  onSubmit,
  onCancel,
}: {
  agreements: AgreementOption[];
  initialAgreementId: number | undefined;
  isPending: boolean;
  onSubmit(agreementId: number): Promise<void>;
  onCancel(): void;
}) {
  const [agreementId, setAgreementId] = useState<number | undefined>(initialAgreementId);

  const selectedAgreement = useMemo(
    () => agreements.find((item) => item.id === agreementId) ?? null,
    [agreements, agreementId]
  );
  const hasChanges = agreementId !== initialAgreementId;

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="loanAgreementId">Convenio</FieldLabel>
        <Combobox
          items={agreements}
          value={selectedAgreement}
          onValueChange={(value: AgreementOption | null) => setAgreementId(value?.id)}
          itemToStringValue={(item) => (item ? String(item.id) : '')}
          itemToStringLabel={(item) =>
            item ? `${item.agreementCode} - ${item.businessName}` : ''
          }
        >
          <ComboboxTrigger
            render={
              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                <ComboboxValue placeholder="Seleccione..." />
                <ChevronDownIcon className="text-muted-foreground size-4" />
              </Button>
            }
            id="loanAgreementId"
          />
          <ComboboxContent>
            <ComboboxInput placeholder="Buscar convenio..." showClear showTrigger={false} />
            <ComboboxList>
              <ComboboxEmpty>No se encontraron convenios</ComboboxEmpty>
              <ComboboxCollection>
                {(item: AgreementOption) => (
                  <ComboboxItem key={item.id} value={item}>
                    {item.agreementCode} - {item.businessName}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={isPending || !hasChanges}
          onClick={async () => {
            if (!agreementId) {
              toast.error('Debe seleccionar un convenio');
              return;
            }

            await onSubmit(agreementId);
          }}
        >
          {isPending ? <Spinner /> : null}
          Guardar
        </Button>
      </DialogFooter>
    </div>
  );
}
