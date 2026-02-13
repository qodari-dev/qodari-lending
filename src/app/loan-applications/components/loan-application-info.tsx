'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoanApplication } from '@/schemas/loan-application';
import { useHasPermission } from '@/stores/auth-store-provider';
import { LoanApplicationDetails } from './loan-application-details';

export function LoanApplicationInfo({
  loanApplication,
  opened,
  onOpened,
  onApprove,
  onReject,
}: {
  loanApplication: LoanApplication | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
  onApprove?(loanApplication: LoanApplication): void;
  onReject?(loanApplication: LoanApplication): void;
}) {
  const canApprove = useHasPermission('loan-applications:approve');
  const canReject = useHasPermission('loan-applications:reject');
  if (!loanApplication) return null;
  const isPending = loanApplication.status === 'PENDING';

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Informacion de solicitud</SheetTitle>
        </SheetHeader>

        <LoanApplicationDetails loanApplication={loanApplication} className="px-4" />

        {isPending && (canApprove || canReject) ? (
          <div className="mt-4 flex justify-end gap-2 px-4 pb-4">
            {canReject ? (
              <Button
                variant="destructive"
                onClick={() => onReject?.(loanApplication)}
                disabled={!onReject}
              >
                Rechazar
              </Button>
            ) : null}
            {canApprove ? (
              <Button onClick={() => onApprove?.(loanApplication)} disabled={!onApprove}>
                Aprobar
              </Button>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
