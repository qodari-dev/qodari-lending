import { LoanStatement, LoanStatementEntry } from '@/schemas/loan';
import { CreditExtractClientMovement, CreditExtractClientStatement } from '@/schemas/credit-report';

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDecimalString(value: number): string {
  return roundMoney(value).toFixed(2);
}

function resolveMovementLabel(entry: LoanStatementEntry): string {
  switch (entry.sourceType) {
    case 'LOAN_APPROVAL':
      return 'Desembolso';
    case 'LOAN_PAYMENT':
      return 'Abono';
    case 'LOAN_PAYMENT_VOID':
      return 'Reverso abono';
    case 'PROCESS_RUN':
      switch (entry.processType) {
        case 'INTEREST':
          return 'Interes corriente';
        case 'LATE_INTEREST':
          return 'Interes de mora';
        case 'INSURANCE':
          return 'Seguro';
        case 'OTHER':
          return 'Otros conceptos';
        default:
          return 'Causacion';
      }
    case 'REFINANCE':
      return 'Refinanciacion';
    case 'MANUAL_ADJUSTMENT':
      return 'Ajuste';
    default:
      return entry.sourceLabel;
  }
}

function resolveConcept(entry: LoanStatementEntry): string {
  const description = entry.description?.trim();
  if (description) return description;

  switch (entry.sourceType) {
    case 'LOAN_APPROVAL':
      return 'Desembolso de credito';
    case 'LOAN_PAYMENT':
      return 'Pago aplicado';
    case 'LOAN_PAYMENT_VOID':
      return 'Reverso de pago';
    case 'PROCESS_RUN':
      switch (entry.processType) {
        case 'INTEREST':
          return 'Causacion de interes corriente';
        case 'LATE_INTEREST':
          return 'Causacion de interes de mora';
        case 'INSURANCE':
          return 'Causacion de seguro';
        case 'OTHER':
          return 'Causacion de otros conceptos';
        default:
          return 'Causacion';
      }
    case 'REFINANCE':
      return 'Movimiento por refinanciacion';
    case 'MANUAL_ADJUSTMENT':
      return 'Ajuste manual';
    default:
      return entry.sourceLabel;
  }
}

function buildGroupKey(entry: LoanStatementEntry): string {
  return [
    entry.entryDate,
    entry.sourceType,
    entry.sourceId,
    entry.documentCode,
    entry.status,
    entry.processType,
  ].join('|');
}

export function buildCreditExtractClientStatement(
  statement: LoanStatement
): CreditExtractClientStatement {
  type MovementGroup = {
    id: string;
    entryDate: string;
    movement: string;
    reference: string;
    concepts: Set<string>;
    documentCodes: Set<string>;
    chargeAmount: number;
    paymentAmount: number;
    netDelta: number;
  };

  const movementGroups = new Map<string, MovementGroup>();

  for (const entry of statement.entries) {
    const delta = roundMoney(toNumber(entry.receivableDelta));
    if (Math.abs(delta) < 0.005) continue;

    const key = buildGroupKey(entry);
    const current = movementGroups.get(key) ?? {
      id: key,
      entryDate: entry.entryDate,
      movement: resolveMovementLabel(entry),
      reference: entry.relatedPaymentNumber ?? entry.documentCode,
      concepts: new Set<string>(),
      documentCodes: new Set<string>(),
      chargeAmount: 0,
      paymentAmount: 0,
      netDelta: 0,
    };

    current.concepts.add(resolveConcept(entry));
    current.documentCodes.add(entry.documentCode);
    if (delta > 0) {
      current.chargeAmount = roundMoney(current.chargeAmount + delta);
    } else {
      current.paymentAmount = roundMoney(current.paymentAmount + Math.abs(delta));
    }
    current.netDelta = roundMoney(current.netDelta + delta);
    movementGroups.set(key, current);
  }

  const groups = Array.from(movementGroups.values());
  let runningBalance = roundMoney(toNumber(statement.openingBalance));
  let totalCharges = 0;
  let totalPayments = 0;

  const movements: CreditExtractClientMovement[] = groups.map((group) => {
    totalCharges = roundMoney(totalCharges + group.chargeAmount);
    totalPayments = roundMoney(totalPayments + group.paymentAmount);
    runningBalance = roundMoney(runningBalance + group.netDelta);

    const concept =
      group.concepts.size <= 1 ? (Array.from(group.concepts)[0] ?? '-') : 'Movimiento combinado';
    const documents = Array.from(group.documentCodes);
    const fallbackReference =
      documents.length > 1 ? `${documents[0]} (+${documents.length - 1})` : (documents[0] ?? '-');

    return {
      id: group.id,
      entryDate: group.entryDate,
      movement: group.movement,
      reference: group.reference || fallbackReference,
      concept,
      chargeAmount: toDecimalString(group.chargeAmount),
      paymentAmount: toDecimalString(group.paymentAmount),
      runningBalance: toDecimalString(runningBalance),
    };
  });

  return {
    from: statement.from,
    to: statement.to,
    openingBalance: statement.openingBalance,
    closingBalance: toDecimalString(runningBalance),
    totalCharges: toDecimalString(totalCharges),
    totalPayments: toDecimalString(totalPayments),
    movements,
  };
}
