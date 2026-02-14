import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  startOfDay,
} from 'date-fns';
import type {
  DayCountConvention,
  FinancingType,
  InsuranceAccrualMethod,
  InsuranceRangeMetric,
  InterestRateType,
} from '@/schemas/credit-product';
import type { InsuranceRateType } from '@/schemas/insurance-company';
import type { PaymentScheduleMode } from '@/schemas/payment-frequency';
import { roundMoney, toSafeNumber } from './number-utils';

export type {
  DayCountConvention,
  FinancingType,
  InsuranceAccrualMethod,
  InsuranceRangeMetric,
  InsuranceRateType,
  InterestRateType,
};

export type InsuranceRateRangeRule = {
  rangeMetric: InsuranceRangeMetric;
  valueFrom: number;
  valueTo: number;
  rateType: InsuranceRateType;
  rateValue?: string | number | null;
  fixedAmount?: string | number | null;
};

export type CreditSimulationInput = {
  financingType: FinancingType;
  principal: number;
  annualRatePercent: number;
  installments: number;
  firstPaymentDate: Date;
  disbursementDate?: Date;
  daysInterval: number;
  paymentScheduleMode?: PaymentScheduleMode;
  dayOfMonth?: number | null;
  semiMonthDay1?: number | null;
  semiMonthDay2?: number | null;
  useEndOfMonthFallback?: boolean;
  interestRateType?: InterestRateType;
  interestDayCountConvention?: DayCountConvention;
  insuranceAccrualMethod?: InsuranceAccrualMethod;
  insuranceRatePercent?: number;
  insuranceFixedAmount?: number;
  insuranceMinimumAmount?: number;
};

export type CreditSimulationInstallment = {
  installmentNumber: number;
  dueDate: string;
  days: number;
  openingBalance: number;
  principal: number;
  interest: number;
  insurance: number;
  payment: number;
  closingBalance: number;
};

export type CreditSimulationSummary = {
  principal: number;
  annualRatePercent: number;
  insuranceRatePercent: number;
  installments: number;
  daysInterval: number;
  totalPrincipal: number;
  totalInterest: number;
  totalInsurance: number;
  totalPayment: number;
  firstInstallmentPayment: number;
  maxInstallmentPayment: number;
  minInstallmentPayment: number;
};

export type CreditSimulationResult = {
  summary: CreditSimulationSummary;
  installments: CreditSimulationInstallment[];
};

export type ResolvedInsuranceFactor = {
  insuranceFactor: number;
  insuranceRateType: InsuranceRateType | null;
  insuranceRatePercent: number;
  insuranceFixedAmount: number;
  insuranceMinimumAmount: number;
};

function getValidCalendarDay(
  year: number,
  month: number,
  day: number,
  useEndOfMonthFallback: boolean
): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  if (day <= lastDay) return day;
  return useEndOfMonthFallback ? lastDay : lastDay;
}

function createCalendarDate(
  year: number,
  month: number,
  day: number,
  useEndOfMonthFallback: boolean
): Date {
  return startOfDay(
    new Date(year, month, getValidCalendarDay(year, month, day, useEndOfMonthFallback))
  );
}

function nextSemiMonthlyDate(args: {
  previous: Date;
  day1: number;
  day2: number;
  useEndOfMonthFallback: boolean;
}): Date {
  const previous = startOfDay(args.previous);
  const year = previous.getFullYear();
  const month = previous.getMonth();

  const firstCandidate = createCalendarDate(year, month, args.day1, args.useEndOfMonthFallback);
  const secondCandidate = createCalendarDate(year, month, args.day2, args.useEndOfMonthFallback);

  if (previous < firstCandidate) return firstCandidate;
  if (previous < secondCandidate) return secondCandidate;

  const nextMonth = addMonths(previous, 1);
  return createCalendarDate(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    args.day1,
    args.useEndOfMonthFallback
  );
}

function buildDueDates(input: CreditSimulationInput): Date[] {
  const firstDate = startOfDay(input.firstPaymentDate);
  const dueDates: Date[] = [firstDate];
  const useEndOfMonthFallback = input.useEndOfMonthFallback ?? true;
  const mode = input.paymentScheduleMode ?? 'INTERVAL_DAYS';

  if (input.installments <= 1) return dueDates;

  if (mode === 'MONTHLY_CALENDAR') {
    const anchorDay = firstDate.getDate();
    for (let index = 2; index <= input.installments; index++) {
      const monthRef = addMonths(firstDate, index - 1);
      dueDates.push(
        createCalendarDate(
          monthRef.getFullYear(),
          monthRef.getMonth(),
          anchorDay,
          useEndOfMonthFallback
        )
      );
    }
    return dueDates;
  }

  if (mode === 'SEMI_MONTHLY') {
    const day1 = Math.min(input.semiMonthDay1 ?? 15, input.semiMonthDay2 ?? 30);
    const day2 = Math.max(input.semiMonthDay1 ?? 15, input.semiMonthDay2 ?? 30);
    let previous = firstDate;
    for (let index = 2; index <= input.installments; index++) {
      previous = nextSemiMonthlyDate({
        previous,
        day1,
        day2,
        useEndOfMonthFallback,
      });
      dueDates.push(previous);
    }
    return dueDates;
  }

  for (let index = 2; index <= input.installments; index++) {
    dueDates.push(addDays(firstDate, (index - 1) * input.daysInterval));
  }
  return dueDates;
}

function getYearBaseDays(convention: DayCountConvention): number {
  switch (convention) {
    case 'ACTUAL_365':
      return 365;
    case 'ACTUAL_ACTUAL':
      return 365.25;
    case '30_360':
    case 'ACTUAL_360':
    default:
      return 360;
  }
}

function calculatePeriodRate(args: {
  ratePercent: number;
  daysInterval: number;
  interestRateType: InterestRateType;
  dayCountConvention: DayCountConvention;
}): number {
  const rateDecimal = args.ratePercent / 100;
  if (rateDecimal === 0) return 0;

  const monthFraction = args.daysInterval / 30;
  const yearFraction = args.daysInterval / getYearBaseDays(args.dayCountConvention);

  switch (args.interestRateType) {
    case 'EFFECTIVE_ANNUAL':
      return Math.pow(1 + rateDecimal, yearFraction) - 1;
    case 'EFFECTIVE_MONTHLY':
      return Math.pow(1 + rateDecimal, monthFraction) - 1;
    case 'NOMINAL_MONTHLY':
    case 'MONTHLY_FLAT':
      return rateDecimal * monthFraction;
    case 'NOMINAL_ANNUAL':
    default:
      return rateDecimal * yearFraction;
  }
}

function calculateInsuranceCharge(args: {
  installmentNumber: number;
  openingBalance: number;
  principal: number;
  insuranceAccrualMethod: InsuranceAccrualMethod;
  insuranceRatePercent: number;
  insuranceFixedAmount: number;
  insuranceMinimumAmount: number;
}): number {
  if (args.insuranceAccrualMethod === 'ONE_TIME' && args.installmentNumber > 1) {
    return 0;
  }

  const balanceBase =
    args.insuranceAccrualMethod === 'ONE_TIME' ? args.principal : args.openingBalance;

  let insurance =
    args.insuranceFixedAmount > 0
      ? args.insuranceFixedAmount
      : balanceBase * (args.insuranceRatePercent / 100);

  if (args.insuranceMinimumAmount > 0 && insurance > 0) {
    insurance = Math.max(insurance, args.insuranceMinimumAmount);
  }

  return roundMoney(insurance);
}

function calculateInstallmentInterest(args: {
  financingType: FinancingType;
  principal: number;
  openingBalance: number;
  periodRate: number;
}): number {
  return args.financingType === 'FIXED_AMOUNT'
    ? roundMoney(args.principal * args.periodRate)
    : roundMoney(args.openingBalance * args.periodRate);
}

function simulateRemainingWithFixedPayment(args: {
  paymentAmount: number;
  input: CreditSimulationInput;
  periodRates: number[];
  insuranceAccrualMethod: InsuranceAccrualMethod;
  insuranceRatePercent: number;
  insuranceFixedAmount: number;
  insuranceMinimumAmount: number;
}): number {
  let remaining = roundMoney(args.input.principal);

  for (let index = 1; index <= args.input.installments; index++) {
    const openingBalance = remaining;
    const periodRate = args.periodRates[index - 1] ?? 0;
    const interest = calculateInstallmentInterest({
      financingType: args.input.financingType,
      principal: args.input.principal,
      openingBalance,
      periodRate,
    });
    const insurance = calculateInsuranceCharge({
      installmentNumber: index,
      openingBalance,
      principal: args.input.principal,
      insuranceAccrualMethod: args.insuranceAccrualMethod,
      insuranceRatePercent: args.insuranceRatePercent,
      insuranceFixedAmount: args.insuranceFixedAmount,
      insuranceMinimumAmount: args.insuranceMinimumAmount,
    });

    let principalPayment = roundMoney(args.paymentAmount - interest - insurance);
    if (principalPayment <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    if (principalPayment > openingBalance) {
      principalPayment = roundMoney(openingBalance);
    }

    remaining = roundMoney(openingBalance - principalPayment);
  }

  return remaining;
}

function findFixedPaymentAmount(args: {
  input: CreditSimulationInput;
  periodRates: number[];
  insuranceAccrualMethod: InsuranceAccrualMethod;
  insuranceRatePercent: number;
  insuranceFixedAmount: number;
  insuranceMinimumAmount: number;
}): number {
  let low = 0;
  let high = roundMoney(Math.max(1, args.input.principal / Math.max(args.input.installments, 1)));

  while (high < args.input.principal * 10) {
    const remaining = simulateRemainingWithFixedPayment({
      paymentAmount: high,
      ...args,
    });
    if (Number.isFinite(remaining) && remaining <= 0) {
      break;
    }
    high = roundMoney(high * 1.5);
  }

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const remaining = simulateRemainingWithFixedPayment({
      paymentAmount: mid,
      ...args,
    });

    if (!Number.isFinite(remaining) || remaining > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return roundMoney(high);
}

export function findInsuranceRateRange(args: {
  ranges: InsuranceRateRangeRule[] | null | undefined;
  rangeMetric: InsuranceRangeMetric;
  metricValue: number;
}): InsuranceRateRangeRule | null {
  if (!args.ranges?.length) return null;

  return (
    args.ranges.find(
      (range) =>
        range.rangeMetric === args.rangeMetric &&
        args.metricValue >= range.valueFrom &&
        args.metricValue <= range.valueTo
    ) ?? null
  );
}

export function resolveInsuranceFactorFromRange(args: {
  range: InsuranceRateRangeRule | null | undefined;
  minimumValue?: string | number | null;
}): ResolvedInsuranceFactor {
  if (!args.range) {
    return {
      insuranceFactor: 0,
      insuranceRateType: null,
      insuranceRatePercent: 0,
      insuranceFixedAmount: 0,
      insuranceMinimumAmount: toSafeNumber(args.minimumValue),
    };
  }

  const insuranceMinimumAmount = toSafeNumber(args.minimumValue);

  if (args.range.rateType === 'FIXED_AMOUNT') {
    const insuranceFixedAmount = toSafeNumber(args.range.fixedAmount);
    return {
      insuranceFactor: insuranceFixedAmount,
      insuranceRateType: 'FIXED_AMOUNT',
      insuranceRatePercent: 0,
      insuranceFixedAmount,
      insuranceMinimumAmount,
    };
  }

  const insuranceRatePercent = toSafeNumber(args.range.rateValue);
  return {
    insuranceFactor: insuranceRatePercent,
    insuranceRateType: 'PERCENTAGE',
    insuranceRatePercent,
    insuranceFixedAmount: 0,
    insuranceMinimumAmount,
  };
}

export function calculateCreditSimulation(input: CreditSimulationInput): CreditSimulationResult {
  const interestRateType = input.interestRateType ?? 'EFFECTIVE_ANNUAL';
  const interestDayCountConvention = input.interestDayCountConvention ?? 'ACTUAL_360';
  const insuranceAccrualMethod = input.insuranceAccrualMethod ?? 'PER_INSTALLMENT';
  const insuranceRatePercent = input.insuranceRatePercent ?? 0;
  const insuranceFixedAmount = input.insuranceFixedAmount ?? 0;
  const insuranceMinimumAmount = input.insuranceMinimumAmount ?? 0;
  const disbursementDate = startOfDay(input.disbursementDate ?? new Date());
  const dueDates = buildDueDates(input);
  const periodDaysList = dueDates.map((dueDate, index) => {
    const previousDueDate = index === 0 ? disbursementDate : (dueDates[index - 1] ?? disbursementDate);
    return Math.max(0, differenceInCalendarDays(dueDate, previousDueDate));
  });
  const periodRates = periodDaysList.map((periodDays) =>
    calculatePeriodRate({
      ratePercent: input.annualRatePercent,
      daysInterval: periodDays,
      interestRateType,
      dayCountConvention: interestDayCountConvention,
    })
  );
  const fixedPaymentAmount =
    input.installments > 1
      ? findFixedPaymentAmount({
        input,
          periodRates,
          insuranceAccrualMethod,
          insuranceRatePercent,
          insuranceFixedAmount,
          insuranceMinimumAmount,
        })
      : 0;

  let remaining = roundMoney(input.principal);
  const installments: CreditSimulationInstallment[] = [];

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalInsurance = 0;

  for (let index = 1; index <= input.installments; index++) {
    const openingBalance = remaining;
    const dueDate = dueDates[index - 1] ?? dueDates[dueDates.length - 1];
    const periodDays = periodDaysList[index - 1] ?? input.daysInterval;
    const periodRate = periodRates[index - 1] ?? 0;

    const interest = calculateInstallmentInterest({
      financingType: input.financingType,
      principal: input.principal,
      openingBalance,
      periodRate,
    });

    const insurance = calculateInsuranceCharge({
      installmentNumber: index,
      openingBalance,
      principal: input.principal,
      insuranceAccrualMethod,
      insuranceRatePercent,
      insuranceFixedAmount,
      insuranceMinimumAmount,
    });

    let principalPayment =
      input.installments === 1
        ? roundMoney(openingBalance)
        : index === input.installments
          ? roundMoney(openingBalance)
          : roundMoney(fixedPaymentAmount - interest - insurance);

    if (principalPayment < 0) {
      principalPayment = 0;
    }
    if (principalPayment > openingBalance) {
      principalPayment = roundMoney(openingBalance);
    }

    const payment =
      index === input.installments
        ? roundMoney(principalPayment + interest + insurance)
        : roundMoney(principalPayment + interest + insurance);
    const closingBalance = roundMoney(openingBalance - principalPayment);

    installments.push({
      installmentNumber: index,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      days: periodDays,
      openingBalance,
      principal: principalPayment,
      interest,
      insurance,
      payment,
      closingBalance,
    });

    remaining = closingBalance;
    totalPrincipal += principalPayment;
    totalInterest += interest;
    totalInsurance += insurance;
  }

  totalPrincipal = roundMoney(totalPrincipal);
  totalInterest = roundMoney(totalInterest);
  totalInsurance = roundMoney(totalInsurance);

  const payments = installments.map((item) => item.payment);

  return {
    summary: {
      principal: roundMoney(input.principal),
      annualRatePercent: input.annualRatePercent,
      insuranceRatePercent,
      installments: input.installments,
      daysInterval: input.daysInterval,
      totalPrincipal,
      totalInterest,
      totalInsurance,
      totalPayment: roundMoney(totalPrincipal + totalInterest + totalInsurance),
      firstInstallmentPayment: payments[0] ?? 0,
      maxInstallmentPayment: payments.length ? Math.max(...payments) : 0,
      minInstallmentPayment: payments.length ? Math.min(...payments) : 0,
    },
    installments,
  };
}
