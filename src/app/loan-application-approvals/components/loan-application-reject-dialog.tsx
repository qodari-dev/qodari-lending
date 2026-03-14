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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useRejectLoanApplication } from '@/hooks/queries/use-loan-application-queries';
import { useRejectionReasons } from '@/hooks/queries/use-rejection-reason-queries';
import { LoanApplication } from '@/schemas/loan-application';
import React from 'react';

export function LoanApplicationRejectDialog({
  loanApplication,
  opened,
  onOpenChange,
  onRejected,
}: {
  loanApplication: LoanApplication | undefined;
  opened: boolean;
  onOpenChange(opened: boolean): void;
  onRejected?(): void;
}) {
  const [rejectNote, setRejectNote] = React.useState('');
  const [rejectReasonId, setRejectReasonId] = React.useState<number | undefined>();
  const { mutateAsync: rejectLoanApplication, isPending: isRejecting } =
    useRejectLoanApplication();

  const { data: rejectionReasonsData } = useRejectionReasons({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const rejectionReasons = rejectionReasonsData?.body?.data ?? [];

  React.useEffect(() => {
    if (opened) {
      setRejectNote('');
      setRejectReasonId(undefined);
    }
  }, [opened]);

  async function handleSubmit() {
    if (!loanApplication?.id || !rejectReasonId || !rejectNote.trim()) return;

    try {
      await rejectLoanApplication({
        params: { id: loanApplication.id },
        body: {
          statusNote: rejectNote.trim(),
          rejectionReasonId: rejectReasonId,
        },
      });
      onOpenChange(false);
      onRejected?.();
    } catch {
      // toast is handled by the mutation's onError callback
    }
  }

  return (
    <Dialog open={opened} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar solicitud</DialogTitle>
          <DialogDescription>
            Debe seleccionar un motivo de rechazo e ingresar una nota.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rejectReasonId">Motivo rechazo</Label>
          <Select
            value={rejectReasonId ? String(rejectReasonId) : ''}
            onValueChange={(value) => setRejectReasonId(value ? Number(value) : undefined)}
          >
            <SelectTrigger id="rejectReasonId">
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {rejectionReasons.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rejectNote">Nota</Label>
          <Textarea
            id="rejectNote"
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
            placeholder="Ingrese motivo de rechazo..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isRejecting || !rejectReasonId || !rejectNote.trim()}
          >
            {isRejecting ? <Spinner /> : null}
            Rechazar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
