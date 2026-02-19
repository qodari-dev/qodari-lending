import { roundMoney, toNumber } from '@/server/utils/value-utils';

const PAYMENT_PROCESS_TYPE_BY_MOVEMENT = {
  RECEIPT: 'RECEIPT',
  PLEDGE: 'PLEDGE',
  PAYROLL: 'PAYROLL',
  DEPOSIT: 'DEPOSIT',
  OTHER: 'OTHER',
} as const;

export type SupportedPaymentMovementType = keyof typeof PAYMENT_PROCESS_TYPE_BY_MOVEMENT;

export function mapPaymentMovementTypeToProcessType(
  movementType: SupportedPaymentMovementType
): (typeof PAYMENT_PROCESS_TYPE_BY_MOVEMENT)[SupportedPaymentMovementType] {
  return PAYMENT_PROCESS_TYPE_BY_MOVEMENT[movementType];
}

function buildNumericDocumentCode(prefix: string, id: number): string {
  return `${prefix}${String(id % 1_000_000).padStart(6, '0')}`;
}

export function buildLiquidationDocumentCode(loanId: number): string {
  return buildNumericDocumentCode('L', loanId);
}

export function buildPaymentDocumentCode(loanPaymentId: number): string {
  return buildNumericDocumentCode('R', loanPaymentId);
}

export function buildPaymentVoidDocumentCode(loanPaymentId: number): string {
  return buildNumericDocumentCode('V', loanPaymentId);
}

export function buildProcessRunDocumentCode(
  processType: 'INTEREST' | 'LATE_INTEREST' | 'INSURANCE' | 'OTHER',
  processRunId: number
): string {
  const prefixByProcessType = {
    INTEREST: 'I',
    LATE_INTEREST: 'M',
    INSURANCE: 'S',
    OTHER: 'O',
  } as const;

  return buildNumericDocumentCode(prefixByProcessType[processType], processRunId);
}

export function allocateAmountByPercentage(args: {
  totalAmount: number;
  lines: Array<{ id: number; percentage: string }>;
}) {
  const result = new Map<number, number>();
  if (!args.lines.length) return result;

  const totalPercentage = args.lines.reduce((sum, line) => sum + toNumber(line.percentage), 0);
  if (!Number.isFinite(totalPercentage) || totalPercentage <= 0) {
    return result;
  }

  let allocated = 0;
  for (let index = 0; index < args.lines.length; index += 1) {
    const line = args.lines[index];
    const isLast = index === args.lines.length - 1;
    const amount = isLast
      ? roundMoney(args.totalAmount - allocated)
      : roundMoney((args.totalAmount * toNumber(line.percentage)) / totalPercentage);

    allocated += amount;
    result.set(line.id, amount);
  }

  return result;
}

export function roundByMode(
  value: number,
  mode: 'NEAREST' | 'UP' | 'DOWN',
  decimals: number
): number {
  const safeDecimals = Number.isFinite(decimals) ? Math.max(0, Math.min(6, decimals)) : 2;
  const factor = 10 ** safeDecimals;
  if (mode === 'UP') return Math.ceil(value * factor) / factor;
  if (mode === 'DOWN') return Math.floor(value * factor) / factor;
  return Math.round(value * factor) / factor;
}

export function calculateOneTimeConceptAmount(args: {
  concept: {
    calcMethod: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'TIERED_FIXED_AMOUNT' | 'TIERED_PERCENTAGE';
    baseAmount: 'DISBURSED_AMOUNT' | 'PRINCIPAL' | 'OUTSTANDING_BALANCE' | 'INSTALLMENT_AMOUNT' | null;
    rate: string | null;
    amount: string | null;
    minAmount: string | null;
    maxAmount: string | null;
    roundingMode: 'NEAREST' | 'UP' | 'DOWN';
    roundingDecimals: number;
  };
  principal: number;
  firstInstallmentAmount: number;
}) {
  return calculateBillingConceptAmount({
    concept: args.concept,
    baseValues: {
      DISBURSED_AMOUNT: args.principal,
      PRINCIPAL: args.principal,
      OUTSTANDING_BALANCE: args.principal,
      INSTALLMENT_AMOUNT: args.firstInstallmentAmount,
    },
  });
}

export function calculateBillingConceptAmount(args: {
  concept: {
    calcMethod: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'TIERED_FIXED_AMOUNT' | 'TIERED_PERCENTAGE';
    baseAmount: 'DISBURSED_AMOUNT' | 'PRINCIPAL' | 'OUTSTANDING_BALANCE' | 'INSTALLMENT_AMOUNT' | null;
    rate: string | null;
    amount: string | null;
    minAmount: string | null;
    maxAmount: string | null;
    roundingMode: 'NEAREST' | 'UP' | 'DOWN';
    roundingDecimals: number;
  };
  baseValues: Partial<
    Record<'DISBURSED_AMOUNT' | 'PRINCIPAL' | 'OUTSTANDING_BALANCE' | 'INSTALLMENT_AMOUNT', number>
  >;
}) {
  const base =
    args.concept.baseAmount !== null ? toNumber(args.baseValues[args.concept.baseAmount] ?? 0) : 0;

  const rate = toNumber(args.concept.rate);
  const amountValue = toNumber(args.concept.amount);

  let calculated = 0;
  if (args.concept.calcMethod === 'FIXED_AMOUNT') {
    calculated = amountValue;
  } else if (args.concept.calcMethod === 'PERCENTAGE') {
    calculated = (base * rate) / 100;
  } else if (args.concept.calcMethod === 'TIERED_FIXED_AMOUNT') {
    calculated = amountValue;
  } else if (args.concept.calcMethod === 'TIERED_PERCENTAGE') {
    calculated = (base * rate) / 100;
  }

  const minAmount = toNumber(args.concept.minAmount);
  const maxAmount = toNumber(args.concept.maxAmount);
  if (Number.isFinite(minAmount) && minAmount > 0) {
    calculated = Math.max(calculated, minAmount);
  }
  if (Number.isFinite(maxAmount) && maxAmount > 0) {
    calculated = Math.min(calculated, maxAmount);
  }

  const rounded = roundByMode(
    calculated,
    args.concept.roundingMode,
    args.concept.roundingDecimals ?? 2
  );
  return roundMoney(rounded);
}
