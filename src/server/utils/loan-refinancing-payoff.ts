import {
  accountingEntries,
  glAccounts,
  loanPayments,
  loanStatusHistory,
  loans,
  portfolioEntries,
  userPaymentReceiptTypes,
} from '@/server/db';
import {
  buildPaymentDocumentCode,
  mapPaymentMovementTypeToProcessType,
} from '@/server/utils/accounting-utils';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import type { DbTransaction } from '@/server/db/connection';
import { and, asc, eq, gt } from 'drizzle-orm';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export type CreateRefinancingPayoffInput = {
  loanId: number;
  refinancingReceiptTypeId: number;
  userId: string;
  userName: string;
  payoffDate: string; // YYYY-MM-DD
  refinancingLoanId: number;
};

export type RefinancingPayoffResult = {
  paymentId: number;
  payoffAmount: number;
  creditNumber: string;
};

// ──────────────────────────────────────────────────────────────────────
// Payment number generation (same pattern as loan-payment-create.ts)
// ──────────────────────────────────────────────────────────────────────

function buildPaymentNumber(prefix: string): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const rnd = String(Math.floor(Math.random() * 900) + 100);
  const normalizedPrefix = prefix.trim().toUpperCase();
  return `${normalizedPrefix}${yy}${mm}${dd}${hh}${mi}${ss}${rnd}`;
}

async function ensureUniquePaymentNumber(
  tx: DbTransaction,
  args: { receiptTypeId: number; prefix: string }
): Promise<string> {
  for (let index = 0; index < 10; index += 1) {
    const paymentNumber = buildPaymentNumber(args.prefix);
    const exists = await tx.query.loanPayments.findFirst({
      where: and(
        eq(loanPayments.receiptTypeId, args.receiptTypeId),
        eq(loanPayments.paymentNumber, paymentNumber)
      ),
      columns: { id: true },
    });
    if (!exists) {
      return paymentNumber;
    }
  }
  throwHttpError({
    status: 500,
    message: 'No fue posible generar consecutivo del abono de refinanciacion',
    code: 'INTERNAL_SERVER_ERROR',
  });
}

// ──────────────────────────────────────────────────────────────────────
// Main function
// ──────────────────────────────────────────────────────────────────────

export async function createRefinancingPayoff(
  tx: DbTransaction,
  input: CreateRefinancingPayoffInput
): Promise<RefinancingPayoffResult> {
  // 1. Validate user has the refinancing receipt type assigned
  const availableReceiptType = await tx.query.userPaymentReceiptTypes.findFirst({
    where: and(
      eq(userPaymentReceiptTypes.userId, input.userId),
      eq(userPaymentReceiptTypes.paymentReceiptTypeId, input.refinancingReceiptTypeId)
    ),
    with: {
      paymentReceiptType: true,
    },
  });

  if (!availableReceiptType?.paymentReceiptType) {
    throwHttpError({
      status: 400,
      message: 'El usuario no tiene asignado el tipo de recibo de refinanciacion',
      code: 'BAD_REQUEST',
    });
  }

  if (!availableReceiptType.paymentReceiptType.isActive) {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo de refinanciacion esta inactivo',
      code: 'BAD_REQUEST',
    });
  }

  const receiptType = availableReceiptType.paymentReceiptType;
  const receiptTypeCode = receiptType.code?.trim().toUpperCase();
  if (!receiptTypeCode) {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo de refinanciacion no tiene codigo configurado',
      code: 'BAD_REQUEST',
    });
  }

  if (!receiptType.glAccountId) {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo de refinanciacion no tiene auxiliar contable configurado',
      code: 'BAD_REQUEST',
    });
  }

  const receiptGlAccount = await tx.query.glAccounts.findFirst({
    where: and(eq(glAccounts.id, receiptType.glAccountId), eq(glAccounts.isActive, true)),
    columns: { id: true },
  });

  if (!receiptGlAccount) {
    throwHttpError({
      status: 400,
      message: 'El auxiliar contable del tipo de recibo es invalido o esta inactivo',
      code: 'BAD_REQUEST',
    });
  }

  // 2. Validate loan status
  const existingLoan = await tx.query.loans.findFirst({
    where: eq(loans.id, input.loanId),
    columns: {
      id: true,
      creditNumber: true,
      thirdPartyId: true,
      costCenterId: true,
      status: true,
      disbursementStatus: true,
    },
  });

  if (!existingLoan) {
    throwHttpError({
      status: 404,
      message: `Credito con ID ${input.loanId} no encontrado`,
      code: 'NOT_FOUND',
    });
  }

  if (existingLoan.status !== 'ACCOUNTED' || existingLoan.disbursementStatus !== 'DISBURSED') {
    throwHttpError({
      status: 400,
      message: `El credito ${existingLoan.creditNumber} debe estar contabilizado y desembolsado para refinanciar`,
      code: 'BAD_REQUEST',
    });
  }

  // 3. Get ALL open portfolio entries
  const openEntries = await tx.query.portfolioEntries.findMany({
    where: and(
      eq(portfolioEntries.loanId, input.loanId),
      eq(portfolioEntries.status, 'OPEN'),
      gt(portfolioEntries.balance, '0')
    ),
    orderBy: [
      asc(portfolioEntries.dueDate),
      asc(portfolioEntries.installmentNumber),
      asc(portfolioEntries.id),
    ],
  });

  // 4. Calculate total balance
  const totalBalance = roundMoney(
    openEntries.reduce((acc, entry) => acc + toNumber(entry.balance), 0)
  );

  if (totalBalance <= 0) {
    throwHttpError({
      status: 400,
      message: `El credito ${existingLoan.creditNumber} no tiene saldo pendiente para refinanciar`,
      code: 'BAD_REQUEST',
    });
  }

  // 5. Generate payment number
  const paymentNumber = await ensureUniquePaymentNumber(tx, {
    receiptTypeId: input.refinancingReceiptTypeId,
    prefix: receiptTypeCode,
  });

  // 6. Create loan payment record
  const paymentDate = input.payoffDate;
  const nowDate = formatDateOnly(new Date());

  const [createdPayment] = await tx
    .insert(loanPayments)
    .values({
      receiptTypeId: input.refinancingReceiptTypeId,
      paymentNumber,
      movementType: receiptType.movementType,
      paymentDate,
      loanId: input.loanId,
      description: `Pago por refinanciacion credito ${existingLoan.creditNumber}`.slice(0, 255),
      amount: toDecimalString(totalBalance),
      status: 'PAID',
      statusDate: nowDate,
      createdByUserId: input.userId,
      createdByUserName: input.userName,
      glAccountId: receiptType.glAccountId,
      note: `Refinanciacion - nuevo credito ID: ${input.refinancingLoanId}`,
    })
    .returning();

  // 7. Build accounting entries
  const accountingDocumentCode = buildPaymentDocumentCode(createdPayment.id);
  const processType = mapPaymentMovementTypeToProcessType(receiptType.movementType);

  let sequence = 1;
  const accountingPayload: Array<typeof accountingEntries.$inferInsert> = [
    {
      processType,
      documentCode: accountingDocumentCode,
      sequence,
      entryDate: paymentDate,
      glAccountId: receiptType.glAccountId,
      costCenterId: existingLoan.costCenterId ?? null,
      thirdPartyId: existingLoan.thirdPartyId,
      description: `Refinanciacion ${paymentNumber} credito ${existingLoan.creditNumber}`.slice(
        0,
        255
      ),
      nature: 'DEBIT',
      amount: toDecimalString(totalBalance),
      loanId: existingLoan.id,
      status: 'DRAFT',
      statusDate: nowDate,
      sourceType: 'LOAN_PAYMENT',
      sourceId: String(createdPayment.id),
    },
  ];
  sequence += 1;

  for (const entry of openEntries) {
    accountingPayload.push({
      processType,
      documentCode: accountingDocumentCode,
      sequence,
      entryDate: paymentDate,
      glAccountId: entry.glAccountId,
      costCenterId: null,
      thirdPartyId: existingLoan.thirdPartyId,
      description:
        `Refinanciacion ${paymentNumber} credito ${existingLoan.creditNumber} cuota ${entry.installmentNumber}`.slice(
          0,
          255
        ),
      nature: 'CREDIT',
      amount: entry.balance,
      loanId: existingLoan.id,
      installmentNumber: entry.installmentNumber,
      dueDate: entry.dueDate,
      status: 'DRAFT',
      statusDate: nowDate,
      sourceType: 'LOAN_PAYMENT',
      sourceId: String(createdPayment.id),
    });
    sequence += 1;
  }

  // Validate balance
  const debitTotal = roundMoney(
    accountingPayload
      .filter((e) => e.nature === 'DEBIT')
      .reduce((acc, e) => acc + toNumber(e.amount), 0)
  );
  const creditTotal = roundMoney(
    accountingPayload
      .filter((e) => e.nature === 'CREDIT')
      .reduce((acc, e) => acc + toNumber(e.amount), 0)
  );

  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    throwHttpError({
      status: 400,
      message: `Descuadre contable en pago de refinanciacion del credito ${existingLoan.creditNumber}`,
      code: 'BAD_REQUEST',
    });
  }

  // 8. Insert accounting entries
  await tx.insert(accountingEntries).values(accountingPayload);

  // 9. Apply portfolio deltas (close all entries)
  await applyPortfolioDeltas(tx, {
    movementDate: paymentDate,
    deltas: openEntries.map((entry) => ({
      glAccountId: entry.glAccountId,
      thirdPartyId: existingLoan.thirdPartyId,
      loanId: existingLoan.id,
      installmentNumber: entry.installmentNumber,
      dueDate: entry.dueDate,
      chargeDelta: 0,
      paymentDelta: toNumber(entry.balance),
    })),
  });

  // 10. Transition loan to REFINANCED
  await tx
    .update(loans)
    .set({
      status: 'REFINANCED',
      statusDate: paymentDate,
      lastPaymentDate: paymentDate,
      statusChangedByUserId: input.userId,
      statusChangedByUserName: input.userName,
    })
    .where(eq(loans.id, existingLoan.id));

  // 11. Record status history
  await tx.insert(loanStatusHistory).values({
    loanId: existingLoan.id,
    fromStatus: existingLoan.status,
    toStatus: 'REFINANCED',
    changedByUserId: input.userId,
    changedByUserName: input.userName,
    note: `Credito refinanciado. Nuevo credito ID: ${input.refinancingLoanId}`,
    metadata: {
      refinancingLoanId: input.refinancingLoanId,
      payoffAmount: totalBalance,
      paymentId: createdPayment.id,
    },
  });

  return {
    paymentId: createdPayment.id,
    payoffAmount: totalBalance,
    creditNumber: existingLoan.creditNumber,
  };
}
