import { db, portfolioEntries } from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { and, eq, sql } from 'drizzle-orm';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PortfolioDeltaInput = {
  glAccountId: number;
  thirdPartyId: number;
  loanId: number;
  installmentNumber: number;
  dueDate: string;
  chargeDelta: number;
  paymentDelta: number;
};

function mergePortfolioDeltas(deltas: PortfolioDeltaInput[]): PortfolioDeltaInput[] {
  const map = new Map<string, PortfolioDeltaInput>();

  for (const item of deltas) {
    const key = `${item.glAccountId}:${item.thirdPartyId}:${item.loanId}:${item.installmentNumber}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...item,
        chargeDelta: roundMoney(item.chargeDelta),
        paymentDelta: roundMoney(item.paymentDelta),
      });
      continue;
    }

    existing.chargeDelta = roundMoney(existing.chargeDelta + item.chargeDelta);
    existing.paymentDelta = roundMoney(existing.paymentDelta + item.paymentDelta);
    if (item.dueDate < existing.dueDate) {
      existing.dueDate = item.dueDate;
    }
  }

  return Array.from(map.values()).filter(
    (item) => Math.abs(item.chargeDelta) > 0.001 || Math.abs(item.paymentDelta) > 0.001
  );
}

export async function applyPortfolioDeltas(
  tx: DbTransaction,
  args: {
    movementDate: string;
    deltas: PortfolioDeltaInput[];
  }
) {
  const mergedDeltas = mergePortfolioDeltas(args.deltas);
  console.log('mergedDeltas', mergedDeltas);

  for (const item of mergedDeltas) {
    const hasNegative = item.chargeDelta < 0 || item.paymentDelta < 0;

    if (hasNegative) {
      const existing = await tx.query.portfolioEntries.findFirst({
        where: and(
          eq(portfolioEntries.glAccountId, item.glAccountId),
          eq(portfolioEntries.thirdPartyId, item.thirdPartyId),
          eq(portfolioEntries.loanId, item.loanId),
          eq(portfolioEntries.installmentNumber, item.installmentNumber)
        ),
      });

      if (!existing) {
        throwHttpError({
          status: 400,
          message: 'No se encontro saldo de cartera para aplicar reversa',
          code: 'BAD_REQUEST',
        });
      }

      const nextCharge = roundMoney(toNumber(existing.chargeAmount) + item.chargeDelta);
      const nextPayment = roundMoney(toNumber(existing.paymentAmount) + item.paymentDelta);
      const nextBalance = roundMoney(nextCharge - nextPayment);

      if (nextCharge < -0.01 || nextPayment < -0.01 || nextBalance < -0.01) {
        throwHttpError({
          status: 400,
          message: 'La reversa genera saldos invalidos en cartera',
          code: 'BAD_REQUEST',
        });
      }

      await tx
        .update(portfolioEntries)
        .set({
          dueDate: item.dueDate,
          chargeAmount: toDecimalString(nextCharge),
          paymentAmount: toDecimalString(nextPayment),
          balance: toDecimalString(nextBalance),
          lastMovementDate: args.movementDate,
          status: nextBalance <= 0.01 ? 'CLOSED' : 'OPEN',
        })
        .where(eq(portfolioEntries.id, existing.id));

      continue;
    }

    await tx
      .insert(portfolioEntries)
      .values({
        glAccountId: item.glAccountId,
        thirdPartyId: item.thirdPartyId,
        loanId: item.loanId,
        installmentNumber: item.installmentNumber,
        dueDate: item.dueDate,
        chargeAmount: toDecimalString(item.chargeDelta),
        paymentAmount: toDecimalString(item.paymentDelta),
        balance: toDecimalString(roundMoney(item.chargeDelta - item.paymentDelta)),
        lastMovementDate: args.movementDate,
        status: roundMoney(item.chargeDelta - item.paymentDelta) <= 0.01 ? 'CLOSED' : 'OPEN',
      })
      .onConflictDoUpdate({
        target: [
          portfolioEntries.glAccountId,
          portfolioEntries.thirdPartyId,
          portfolioEntries.loanId,
          portfolioEntries.installmentNumber,
        ],
        set: {
          dueDate: item.dueDate,
          chargeAmount: sql`${portfolioEntries.chargeAmount} + ${toDecimalString(item.chargeDelta)}`,
          paymentAmount: sql`${portfolioEntries.paymentAmount} + ${toDecimalString(item.paymentDelta)}`,
          balance: sql`(${portfolioEntries.chargeAmount} + ${toDecimalString(item.chargeDelta)}) - (${portfolioEntries.paymentAmount} + ${toDecimalString(item.paymentDelta)})`,
          lastMovementDate: args.movementDate,
          status: sql`case when ((${portfolioEntries.chargeAmount} + ${toDecimalString(item.chargeDelta)}) - (${portfolioEntries.paymentAmount} + ${toDecimalString(item.paymentDelta)})) <= 0 then 'CLOSED'::portfolio_entry_status else 'OPEN'::portfolio_entry_status end`,
        },
      });
  }
}
