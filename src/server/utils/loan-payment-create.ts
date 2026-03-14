import {
  accountingEntries,
  db,
  glAccounts,
  loanPaymentMethodAllocations,
  loanPayments,
  loanStatusHistory,
  loans,
  paymentAllocationPolicyRules,
  paymentTenderTypes,
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
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

type LoanPaymentMethodAllocationInput = {
  collectionMethodId: number;
  tenderReference?: string | null;
  amount: string | number;
};

export type CreateLoanPaymentTxInput = {
  userId: string;
  userName: string;
  receiptTypeId: number;
  paymentDate: Date;
  loanId: number;
  description: string;
  amount: string | number;
  glAccountId?: number;
  overpaidAmount?: number;
  note?: string | null;
  payrollReferenceNumber?: string | null;
  payrollPayerDocumentNumber?: string | null;
  billingDispatchId?: number | null;
  loanPaymentMethodAllocations: LoanPaymentMethodAllocationInput[];
};

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
    message: 'No fue posible generar consecutivo del abono',
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export async function createLoanPaymentTx(
  tx: DbTransaction,
  input: CreateLoanPaymentTxInput
): Promise<typeof loanPayments.$inferSelect> {
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
      message: 'El credito debe estar contabilizado y desembolsado para recibir abonos',
      code: 'BAD_REQUEST',
    });
  }

  const availableReceiptType = await tx.query.userPaymentReceiptTypes.findFirst({
    where: and(
      eq(userPaymentReceiptTypes.userId, input.userId),
      eq(userPaymentReceiptTypes.paymentReceiptTypeId, input.receiptTypeId)
    ),
    with: {
      paymentReceiptType: true,
    },
  });

  if (!availableReceiptType || !availableReceiptType.paymentReceiptType) {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo seleccionado no esta habilitado para el usuario actual',
      code: 'BAD_REQUEST',
    });
  }

  if (!availableReceiptType.paymentReceiptType.isActive) {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo seleccionado esta inactivo',
      code: 'BAD_REQUEST',
    });
  }

  const receiptTypeCode = availableReceiptType.paymentReceiptType.code?.trim().toUpperCase();
  if (!receiptTypeCode) {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo seleccionado no tiene codigo configurado',
      code: 'BAD_REQUEST',
    });
  }

  const selectedGlAccountId = input.glAccountId ?? availableReceiptType.paymentReceiptType.glAccountId;
  if (!selectedGlAccountId) {
    throwHttpError({
      status: 400,
      message: 'Debe seleccionar un auxiliar contable',
      code: 'BAD_REQUEST',
    });
  }

  const selectedGlAccount = await tx.query.glAccounts.findFirst({
    where: and(eq(glAccounts.id, selectedGlAccountId), eq(glAccounts.isActive, true)),
    columns: { id: true },
  });

  if (!selectedGlAccount) {
    throwHttpError({
      status: 400,
      message: 'El auxiliar contable seleccionado es invalido o esta inactivo',
      code: 'BAD_REQUEST',
    });
  }

  const collectionMethodIds = [
    ...new Set(input.loanPaymentMethodAllocations.map((item) => item.collectionMethodId)),
  ];

  if (!collectionMethodIds.length) {
    throwHttpError({
      status: 400,
      message: 'Debe registrar al menos una forma de pago',
      code: 'BAD_REQUEST',
    });
  }

  const activeCollectionMethods = await tx.query.paymentTenderTypes.findMany({
    where: and(inArray(paymentTenderTypes.id, collectionMethodIds), eq(paymentTenderTypes.isActive, true)),
    columns: { id: true },
  });

  if (activeCollectionMethods.length !== collectionMethodIds.length) {
    throwHttpError({
      status: 400,
      message: 'Una o mas formas de pago son invalidas o estan inactivas',
      code: 'BAD_REQUEST',
    });
  }

  const paymentDate = formatDateOnly(input.paymentDate);
  const requestedPaymentAmount = roundMoney(toNumber(input.amount));
  if (!Number.isFinite(requestedPaymentAmount) || requestedPaymentAmount <= 0) {
    throwHttpError({
      status: 400,
      message: 'El valor del abono es invalido',
      code: 'BAD_REQUEST',
    });
  }
  const providedOverpaidAmount = roundMoney(Number(input.overpaidAmount ?? 0));

  const openPortfolio = await tx.query.portfolioEntries.findMany({
    where: and(
      eq(portfolioEntries.loanId, input.loanId),
      eq(portfolioEntries.status, 'OPEN'),
      sql`${portfolioEntries.balance} > 0`
    ),
    orderBy: [
      asc(portfolioEntries.dueDate),
      asc(portfolioEntries.installmentNumber),
      asc(portfolioEntries.id),
    ],
  });

  if (!openPortfolio.length) {
    throwHttpError({
      status: 400,
      message: 'El credito no tiene saldo de cartera para aplicar abonos',
      code: 'BAD_REQUEST',
    });
  }

  const totalOutstanding = roundMoney(openPortfolio.reduce((acc, row) => acc + toNumber(row.balance), 0));
  const cappedPaymentAmount = roundMoney(Math.min(requestedPaymentAmount, totalOutstanding));
  const overflowByCap = roundMoney(Math.max(0, requestedPaymentAmount - cappedPaymentAmount));

  if (!Number.isFinite(cappedPaymentAmount) || cappedPaymentAmount <= 0) {
    throwHttpError({
      status: 400,
      message: 'No hay saldo pendiente para aplicar al abono',
      code: 'BAD_REQUEST',
    });
  }

  // ── Query allocation policy chain ──────────────────────────────────
  const loanWithPolicy = await tx.query.loans.findFirst({
    where: eq(loans.id, input.loanId),
    columns: { id: true },
    with: {
      loanApplication: {
        columns: { id: true },
        with: {
          creditProduct: {
            columns: { id: true },
            with: {
              paymentAllocationPolicy: {
                with: {
                  paymentAllocationPolicyRules: {
                    orderBy: [asc(paymentAllocationPolicyRules.priority)],
                    with: {
                      billingConcept: {
                        columns: { id: true, conceptType: true },
                      },
                    },
                  },
                },
              },
              creditProductAccounts: true,
            },
          },
        },
      },
      loanBillingConcepts: {
        columns: { billingConceptId: true, glAccountId: true },
        with: {
          billingConcept: {
            columns: { id: true, conceptType: true },
          },
        },
      },
    },
  });

  const allocationPolicy =
    loanWithPolicy?.loanApplication?.creditProduct?.paymentAllocationPolicy ?? null;
  const policyRules = allocationPolicy?.paymentAllocationPolicyRules ?? [];
  const cpAccounts =
    loanWithPolicy?.loanApplication?.creditProduct?.creditProductAccounts?.[0] ?? null;
  const loanBillingConceptsList = loanWithPolicy?.loanBillingConcepts ?? [];

  // ── Allocation engine ──────────────────────────────────────────────
  const portfolioApplications: Array<{
    glAccountId: number;
    installmentNumber: number;
    dueDate: string;
    amount: number;
  }> = [];

  // Track effective balance per portfolio entry (decreases as rules consume it)
  const effectiveBalances = new Map<number, number>();
  for (const row of openPortfolio) {
    effectiveBalances.set(row.id, roundMoney(toNumber(row.balance)));
  }

  /** Apply payment to a subset of entries; mutates portfolioApplications & effectiveBalances. */
  const applyToEntries = (entries: typeof openPortfolio, budget: number): number => {
    let rem = budget;
    for (const entry of entries) {
      if (rem <= 0.01) break;
      const bal = effectiveBalances.get(entry.id) ?? 0;
      if (bal <= 0) continue;

      const applied = roundMoney(Math.min(rem, bal));
      if (applied <= 0) continue;

      const existing = portfolioApplications.find(
        (a) =>
          a.glAccountId === entry.glAccountId &&
          a.installmentNumber === entry.installmentNumber &&
          a.dueDate === entry.dueDate
      );
      if (existing) {
        existing.amount = roundMoney(existing.amount + applied);
      } else {
        portfolioApplications.push({
          glAccountId: entry.glAccountId,
          installmentNumber: entry.installmentNumber,
          dueDate: entry.dueDate,
          amount: applied,
        });
      }

      effectiveBalances.set(entry.id, roundMoney(bal - applied));
      rem = roundMoney(rem - applied);
    }
    return rem;
  };

  let policyRemainder = cappedPaymentAmount;

  if (policyRules.length > 0 && cpAccounts) {
    // ── Build billingConceptId → Set<glAccountId> map ──
    const conceptToGlAccounts = new Map<number, Set<number>>();
    for (const lbc of loanBillingConceptsList) {
      const conceptType = lbc.billingConcept?.conceptType;
      let glId: number | null = null;

      switch (conceptType) {
        case 'PRINCIPAL':
          glId = cpAccounts.capitalGlAccountId;
          break;
        case 'INTEREST':
          glId = cpAccounts.interestGlAccountId;
          break;
        case 'LATE_INTEREST':
          glId = cpAccounts.lateInterestGlAccountId;
          break;
        default:
          // INSURANCE, FEE, GUARANTEE, OTHER → snapshot GL from loanBillingConcept
          glId = lbc.glAccountId;
          break;
      }

      if (glId) {
        const set = conceptToGlAccounts.get(lbc.billingConceptId) ?? new Set<number>();
        set.add(glId);
        conceptToGlAccounts.set(lbc.billingConceptId, set);
      }
    }

    // ── Apply each rule in priority order ──
    for (const rule of policyRules) {
      if (policyRemainder <= 0.01) break;

      const ruleGlAccounts = conceptToGlAccounts.get(rule.billingConceptId);
      if (!ruleGlAccounts || ruleGlAccounts.size === 0) continue;

      let eligible = openPortfolio.filter(
        (e) => ruleGlAccounts.has(e.glAccountId) && (effectiveBalances.get(e.id) ?? 0) > 0
      );

      if (rule.scope === 'ONLY_PAST_DUE') {
        eligible = eligible.filter((e) => e.dueDate < paymentDate);
      }
      // PAST_DUE_FIRST: entries already sorted dueDate ASC — past-due naturally first

      policyRemainder = applyToEntries(eligible, policyRemainder);
    }

    // ── Handle remaining after all rules (surplus applied back-to-front) ──
    if (policyRemainder > 0.01) {
      const handling = allocationPolicy?.overpaymentHandling ?? 'EXCESS_BALANCE';

      // Surplus applies from last installment to first (back-to-front)
      // so overpayments reduce the loan term rather than advancing the schedule.
      const sortBackToFront = (entries: typeof openPortfolio) =>
        [...entries].sort((a, b) => {
          const dateCmp = b.dueDate.localeCompare(a.dueDate);
          if (dateCmp !== 0) return dateCmp;
          return b.installmentNumber - a.installmentNumber;
        });

      if (handling === 'APPLY_TO_PRINCIPAL') {
        const capitalEntries = sortBackToFront(
          openPortfolio.filter(
            (e) =>
              e.glAccountId === cpAccounts.capitalGlAccountId &&
              (effectiveBalances.get(e.id) ?? 0) > 0
          )
        );
        policyRemainder = applyToEntries(capitalEntries, policyRemainder);
      } else if (handling === 'APPLY_TO_FUTURE_INSTALLMENTS') {
        const remainingEntries = sortBackToFront(
          openPortfolio.filter(
            (e) => (effectiveBalances.get(e.id) ?? 0) > 0
          )
        );
        policyRemainder = applyToEntries(remainingEntries, policyRemainder);
      }
      // EXCESS_BALANCE: policyRemainder stays as-is → becomes overpaid
    }
  } else {
    // Fallback: FIFO (backward compatible when no allocation policy is configured)
    policyRemainder = applyToEntries(openPortfolio, policyRemainder);
  }

  // ── Final amounts ──────────────────────────────────────────────────
  const appliedPaymentAmount = roundMoney(cappedPaymentAmount - Math.max(0, policyRemainder));
  const overpaidAmount = roundMoney(
    Math.max(0, providedOverpaidAmount) + overflowByCap + Math.max(0, policyRemainder)
  );

  if (!Number.isFinite(appliedPaymentAmount) || appliedPaymentAmount <= 0) {
    throwHttpError({
      status: 400,
      message: 'No fue posible aplicar el abono a la cartera',
      code: 'BAD_REQUEST',
    });
  }

  // ── Excess accounting configuration ────────────────────────────────
  let excessGlAccountIdForEntry: number | null = null;
  if (overpaidAmount > 0) {
    const settings = await tx.query.creditsSettings.findFirst({
      columns: {
        minimumMajorPaidAmount: true,
        excessGlAccountId: true,
      },
    });
    const threshold =
      settings?.minimumMajorPaidAmount != null ? toNumber(settings.minimumMajorPaidAmount) : null;
    if (threshold != null && overpaidAmount >= threshold && settings?.excessGlAccountId != null) {
      excessGlAccountIdForEntry = settings.excessGlAccountId;
    }
  }

  const paymentNumber = await ensureUniquePaymentNumber(tx, {
    receiptTypeId: input.receiptTypeId,
    prefix: receiptTypeCode,
  });
  const nowDate = formatDateOnly(new Date());

  const [createdLoanPayment] = await tx
    .insert(loanPayments)
    .values({
      receiptTypeId: input.receiptTypeId,
      paymentNumber,
      movementType: availableReceiptType.paymentReceiptType.movementType,
      paymentDate,
      issuedDate: nowDate,
      loanId: input.loanId,
      description: input.description,
      amount: toDecimalString(appliedPaymentAmount),
      overpaidAmount: overpaidAmount > 0 ? toDecimalString(overpaidAmount) : null,
      status: 'PAID',
      statusDate: nowDate,
      createdByUserId: input.userId,
      createdByUserName: input.userName,
      note: input.note?.trim() ? input.note.trim() : null,
      glAccountId: selectedGlAccountId,
      payrollReferenceNumber: input.payrollReferenceNumber?.trim()
        ? input.payrollReferenceNumber.trim().slice(0, 7)
        : null,
      payrollPayerDocumentNumber: input.payrollPayerDocumentNumber?.trim()
        ? input.payrollPayerDocumentNumber.trim().slice(0, 15)
        : null,
      billingDispatchId: input.billingDispatchId ?? null,
    })
    .returning();

  await tx.insert(loanPaymentMethodAllocations).values(
    input.loanPaymentMethodAllocations.map((item, index) => ({
      loanPaymentId: createdLoanPayment.id,
      collectionMethodId: item.collectionMethodId,
      lineNumber: index + 1,
      tenderReference: item.tenderReference?.trim() ? item.tenderReference.trim() : null,
      amount: toDecimalString(item.amount),
    }))
  );

  const accountingDocumentCode = buildPaymentDocumentCode(createdLoanPayment.id);
  const processType = mapPaymentMovementTypeToProcessType(
    availableReceiptType.paymentReceiptType.movementType
  );

  let sequence = 1;
  const accountingPayload: Array<typeof accountingEntries.$inferInsert> = [
    {
      processType,
      documentCode: accountingDocumentCode,
      sequence,
      entryDate: paymentDate,
      glAccountId: selectedGlAccountId,
      costCenterId: existingLoan.costCenterId ?? null,
      thirdPartyId: existingLoan.thirdPartyId,
      description: `Abono ${paymentNumber} credito ${existingLoan.creditNumber}`.slice(0, 255),
      nature: 'DEBIT',
      amount: toDecimalString(
        excessGlAccountIdForEntry ? appliedPaymentAmount + overpaidAmount : appliedPaymentAmount
      ),
      loanId: existingLoan.id,
      status: 'DRAFT',
      statusDate: nowDate,
      sourceType: 'LOAN_PAYMENT',
      sourceId: String(createdLoanPayment.id),
    },
  ];
  sequence += 1;

  for (const row of portfolioApplications) {
    accountingPayload.push({
      processType,
      documentCode: accountingDocumentCode,
      sequence,
      entryDate: paymentDate,
      glAccountId: row.glAccountId,
      costCenterId: null,
      thirdPartyId: existingLoan.thirdPartyId,
      description: `Abono ${paymentNumber} credito ${existingLoan.creditNumber} cuota ${row.installmentNumber}`.slice(
        0,
        255
      ),
      nature: 'CREDIT',
      amount: toDecimalString(row.amount),
      loanId: existingLoan.id,
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      status: 'DRAFT',
      statusDate: nowDate,
      sourceType: 'LOAN_PAYMENT',
      sourceId: String(createdLoanPayment.id),
    });
    sequence += 1;
  }

  // ── Excess accounting entry (conditional) ──────────────────────────
  if (excessGlAccountIdForEntry && overpaidAmount > 0) {
    accountingPayload.push({
      processType,
      documentCode: accountingDocumentCode,
      sequence,
      entryDate: paymentDate,
      glAccountId: excessGlAccountIdForEntry,
      costCenterId: null,
      thirdPartyId: existingLoan.thirdPartyId,
      description: `Excedente abono ${paymentNumber} credito ${existingLoan.creditNumber}`.slice(
        0,
        255
      ),
      nature: 'CREDIT',
      amount: toDecimalString(overpaidAmount),
      loanId: existingLoan.id,
      installmentNumber: null,
      dueDate: null,
      status: 'DRAFT',
      statusDate: nowDate,
      sourceType: 'LOAN_PAYMENT',
      sourceId: String(createdLoanPayment.id),
    });
    sequence += 1;
  }

  const debitTotal = roundMoney(
    accountingPayload
      .filter((entry) => entry.nature === 'DEBIT')
      .reduce((acc, entry) => acc + toNumber(entry.amount), 0)
  );
  const creditTotal = roundMoney(
    accountingPayload
      .filter((entry) => entry.nature === 'CREDIT')
      .reduce((acc, entry) => acc + toNumber(entry.amount), 0)
  );

  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    throwHttpError({
      status: 400,
      message: 'El abono no cuadra contablemente',
      code: 'BAD_REQUEST',
    });
  }

  await tx.insert(accountingEntries).values(accountingPayload);

  await applyPortfolioDeltas(tx, {
    movementDate: paymentDate,
    deltas: portfolioApplications.map((row) => ({
      glAccountId: row.glAccountId,
      thirdPartyId: existingLoan.thirdPartyId,
      loanId: existingLoan.id,
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      chargeDelta: 0,
      paymentDelta: row.amount,
    })),
  });

  await tx
    .update(loans)
    .set({
      lastPaymentDate: paymentDate,
    })
    .where(eq(loans.id, existingLoan.id));

  const remaining = await tx
    .select({
      balance: sql<string>`coalesce(sum(${portfolioEntries.balance}), 0)`,
    })
    .from(portfolioEntries)
    .where(
      and(
        eq(portfolioEntries.loanId, existingLoan.id),
        eq(portfolioEntries.status, 'OPEN'),
        sql`${portfolioEntries.balance} > 0`
      )
    );

  const remainingBalance = roundMoney(toNumber(remaining[0]?.balance ?? '0'));
  if (remainingBalance <= 0.01) {
    await tx
      .update(loans)
      .set({
        status: 'PAID',
        statusDate: nowDate,
        statusChangedByUserId: input.userId,
        statusChangedByUserName: input.userName || input.userId,
      })
      .where(eq(loans.id, existingLoan.id));

    await tx.insert(loanStatusHistory).values({
      loanId: existingLoan.id,
      fromStatus: existingLoan.status,
      toStatus: 'PAID',
      changedByUserId: input.userId,
      changedByUserName: input.userName || input.userId,
      note: `Credito pagado con abono ${paymentNumber}`.slice(0, 255),
      metadata: {
        loanPaymentId: createdLoanPayment.id,
        accountingDocumentCode,
      },
    });
  }

  const [updatedPayment] = await tx
    .update(loanPayments)
    .set({
      accountingDocumentCode,
    })
    .where(eq(loanPayments.id, createdLoanPayment.id))
    .returning();

  return updatedPayment;
}
