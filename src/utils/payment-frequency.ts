import { addDays, addMonths, startOfDay } from 'date-fns';
import type { PaymentScheduleMode } from '@/schemas/payment-frequency';
import { buildCalendarDate } from './date-utils';

export type PaymentFrequencyScheduleConfig = {
  scheduleMode: PaymentScheduleMode;
  intervalDays: number | null | undefined;
  dayOfMonth: number | null | undefined;
  semiMonthDay1: number | null | undefined;
  semiMonthDay2: number | null | undefined;
  useEndOfMonthFallback?: boolean | null;
};

export function resolvePaymentFrequencyIntervalDays(config: PaymentFrequencyScheduleConfig): number {
  switch (config.scheduleMode) {
    case 'INTERVAL_DAYS':
      return config.intervalDays ?? 0;
    case 'MONTHLY_CALENDAR':
      return 30;
    case 'SEMI_MONTHLY':
      return 15;
    default:
      return 0;
  }
}

export function formatPaymentFrequencyRule(config: PaymentFrequencyScheduleConfig): string {
  switch (config.scheduleMode) {
    case 'INTERVAL_DAYS':
      return `${config.intervalDays ?? '-'} días`;
    case 'MONTHLY_CALENDAR':
      return `Día ${config.dayOfMonth ?? '-'}`;
    case 'SEMI_MONTHLY':
      return `${config.semiMonthDay1 ?? '-'} y ${config.semiMonthDay2 ?? '-'} de cada mes`;
    default:
      return '-';
  }
}

function resolveNextMonthlyDate(args: {
  fromDate: Date;
  dayOfMonth: number;
  useEndOfMonthFallback: boolean;
}): Date {
  const fromDate = startOfDay(args.fromDate);
  const sameMonthCandidate = buildCalendarDate(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    args.dayOfMonth,
    args.useEndOfMonthFallback
  );

  if (sameMonthCandidate >= fromDate) {
    return sameMonthCandidate;
  }

  const nextMonth = addMonths(fromDate, 1);
  return buildCalendarDate(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    args.dayOfMonth,
    args.useEndOfMonthFallback
  );
}

function resolveNextSemiMonthlyDate(args: {
  fromDate: Date;
  day1: number;
  day2: number;
  useEndOfMonthFallback: boolean;
}): Date {
  const fromDate = startOfDay(args.fromDate);
  const day1 = Math.min(args.day1, args.day2);
  const day2 = Math.max(args.day1, args.day2);

  const firstCandidate = buildCalendarDate(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    day1,
    args.useEndOfMonthFallback
  );

  if (firstCandidate >= fromDate) {
    return firstCandidate;
  }

  const secondCandidate = buildCalendarDate(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    day2,
    args.useEndOfMonthFallback
  );

  if (secondCandidate >= fromDate) {
    return secondCandidate;
  }

  const nextMonth = addMonths(fromDate, 1);
  return buildCalendarDate(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    day1,
    args.useEndOfMonthFallback
  );
}

export function resolveSuggestedFirstCollectionDate(args: {
  baseDate?: Date;
  minimumDaysBeforeCollection?: number | null | undefined;
  scheduleMode?: PaymentScheduleMode | null | undefined;
  intervalDays?: number | null | undefined;
  dayOfMonth?: number | null | undefined;
  semiMonthDay1?: number | null | undefined;
  semiMonthDay2?: number | null | undefined;
  useEndOfMonthFallback?: boolean | null | undefined;
}): Date {
  const baseDate = startOfDay(args.baseDate ?? new Date());
  const minimumDays = Math.max(0, Math.trunc(args.minimumDaysBeforeCollection ?? 0));
  const earliestDate = addDays(baseDate, minimumDays);
  const useEndOfMonthFallback = args.useEndOfMonthFallback ?? true;
  const scheduleMode = args.scheduleMode ?? 'INTERVAL_DAYS';

  if (scheduleMode === 'MONTHLY_CALENDAR') {
    const dayOfMonth = args.dayOfMonth ?? earliestDate.getDate();
    return resolveNextMonthlyDate({
      fromDate: earliestDate,
      dayOfMonth,
      useEndOfMonthFallback,
    });
  }

  if (scheduleMode === 'SEMI_MONTHLY') {
    const day1 = args.semiMonthDay1 ?? 15;
    const day2 = args.semiMonthDay2 ?? 30;
    return resolveNextSemiMonthlyDate({
      fromDate: earliestDate,
      day1,
      day2,
      useEndOfMonthFallback,
    });
  }

  const intervalDays = Math.max(1, args.intervalDays ?? 1);
  let candidate = addDays(baseDate, intervalDays);
  while (candidate < earliestDate) {
    candidate = addDays(candidate, intervalDays);
  }
  return candidate;
}
