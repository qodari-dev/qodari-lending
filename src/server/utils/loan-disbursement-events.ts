import { db, loanDisbursementEvents } from '@/server/db';
import type { DbOrTx } from '@/server/db/connection';

export type RecordLoanDisbursementEventInput = {
  loanId: number;
  eventType:
    | 'CREATED'
    | 'LIQUIDATED'
    | 'SENT_TO_ACCOUNTING'
    | 'SENT_TO_BANK'
    | 'DISBURSED'
    | 'REJECTED'
    | 'DATES_UPDATED'
    | 'ADJUSTMENT_SENT_TO_ACCOUNTING';
  eventDate: string;
  fromDisbursementStatus?: 'LIQUIDATED' | 'SENT_TO_ACCOUNTING' | 'SENT_TO_BANK' | 'DISBURSED' | 'REJECTED' | null;
  toDisbursementStatus?: 'LIQUIDATED' | 'SENT_TO_ACCOUNTING' | 'SENT_TO_BANK' | 'DISBURSED' | 'REJECTED' | null;
  previousDisbursementDate?: string | null;
  newDisbursementDate?: string | null;
  previousFirstCollectionDate?: string | null;
  newFirstCollectionDate?: string | null;
  previousMaturityDate?: string | null;
  newMaturityDate?: string | null;
  changedByUserId?: string | null;
  changedByUserName?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordLoanDisbursementEvent(
  executor: DbOrTx,
  args: RecordLoanDisbursementEventInput
) {
  await executor.insert(loanDisbursementEvents).values({
    loanId: args.loanId,
    eventType: args.eventType,
    eventDate: args.eventDate,
    fromDisbursementStatus: args.fromDisbursementStatus ?? null,
    toDisbursementStatus: args.toDisbursementStatus ?? null,
    previousDisbursementDate: args.previousDisbursementDate ?? null,
    newDisbursementDate: args.newDisbursementDate ?? null,
    previousFirstCollectionDate: args.previousFirstCollectionDate ?? null,
    newFirstCollectionDate: args.newFirstCollectionDate ?? null,
    previousMaturityDate: args.previousMaturityDate ?? null,
    newMaturityDate: args.newMaturityDate ?? null,
    changedByUserId: args.changedByUserId ?? null,
    changedByUserName: args.changedByUserName ?? null,
    note: args.note?.slice(0, 255) ?? null,
    metadata: args.metadata ?? null,
  });
}
