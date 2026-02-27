'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoanApplication } from '@/schemas/loan-application';
import { LoanApplicationDetails } from './loan-application-details';

export function LoanApplicationInfo({
  loanApplication,
  opened,
  onOpened,
}: {
  loanApplication: LoanApplication | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!loanApplication) return null;

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Informacion de solicitud</SheetTitle>
        </SheetHeader>

        <LoanApplicationDetails loanApplication={loanApplication} className="px-4" />
      </SheetContent>
    </Sheet>
  );
}
