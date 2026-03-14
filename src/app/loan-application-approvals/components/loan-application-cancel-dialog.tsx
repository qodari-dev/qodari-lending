'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCancelLoanApplication } from '@/hooks/queries/use-loan-application-queries';
import { LoanApplication } from '@/schemas/loan-application';
import React from 'react';

export function LoanApplicationCancelDialog({
  loanApplication,
  opened,
  onOpenChange,
  onCanceled,
}: {
  loanApplication: LoanApplication | undefined;
  opened: boolean;
  onOpenChange(opened: boolean): void;
  onCanceled?(): void;
}) {
  const [cancelNote, setCancelNote] = React.useState('');
  const { mutateAsync: cancelLoanApplication, isPending: isCanceling } =
    useCancelLoanApplication();

  React.useEffect(() => {
    if (opened) setCancelNote('');
  }, [opened]);

  async function handleSubmit() {
    if (!loanApplication?.id || !cancelNote.trim()) return;

    try {
      await cancelLoanApplication({
        params: { id: loanApplication.id },
        body: { statusNote: cancelNote.trim() },
      });
      onOpenChange(false);
      onCanceled?.();
    } catch {
      // toast is handled by the mutation's onError callback
    }
  }

  return (
    <Dialog open={opened} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar solicitud</DialogTitle>
          <DialogDescription>
            Esta accion cambia el estado a cancelada y solicita una nota obligatoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancelNote">Nota</Label>
          <Textarea
            id="cancelNote"
            value={cancelNote}
            onChange={(event) => setCancelNote(event.target.value)}
            placeholder="Ingrese motivo de cancelacion..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handleSubmit} disabled={isCanceling || !cancelNote.trim()}>
            {isCanceling ? <Spinner /> : null}
            Cancelar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
