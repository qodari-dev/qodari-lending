import { addDays, addMonths, startOfDay } from 'date-fns';
import type { PaymentScheduleMode } from '@/schemas/payment-frequency';

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

function getCalendarDay(args: {
  year: number;
  month: number;
  day: number;
  useEndOfMonthFallback: boolean;
}): number {
  const lastDay = new Date(args.year, args.month + 1, 0).getDate();
  if (args.day <= lastDay) return args.day;
  return args.useEndOfMonthFallback ? lastDay : lastDay;
}

function buildCalendarDate(args: {
  year: number;
  month: number;
  day: number;
  useEndOfMonthFallback: boolean;
}): Date {
  return startOfDay(
    new Date(
      args.year,
      args.month,
      getCalendarDay({
        year: args.year,
        month: args.month,
        day: args.day,
        useEndOfMonthFallback: args.useEndOfMonthFallback,
      })
    )
  );
}

function resolveNextMonthlyDate(args: {
  fromDate: Date;
  dayOfMonth: number;
  useEndOfMonthFallback: boolean;
}): Date {
  const fromDate = startOfDay(args.fromDate);
  const sameMonthCandidate = buildCalendarDate({
    year: fromDate.getFullYear(),
    month: fromDate.getMonth(),
    day: args.dayOfMonth,
    useEndOfMonthFallback: args.useEndOfMonthFallback,
  });

  if (sameMonthCandidate >= fromDate) {
    return sameMonthCandidate;
  }

  const nextMonth = addMonths(fromDate, 1);
  return buildCalendarDate({
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth(),
    day: args.dayOfMonth,
    useEndOfMonthFallback: args.useEndOfMonthFallback,
  });
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

  const firstCandidate = buildCalendarDate({
    year: fromDate.getFullYear(),
    month: fromDate.getMonth(),
    day: day1,
    useEndOfMonthFallback: args.useEndOfMonthFallback,
  });

  if (firstCandidate >= fromDate) {
    return firstCandidate;
  }

  const secondCandidate = buildCalendarDate({
    year: fromDate.getFullYear(),
    month: fromDate.getMonth(),
    day: day2,
    useEndOfMonthFallback: args.useEndOfMonthFallback,
  });

  if (secondCandidate >= fromDate) {
    return secondCandidate;
  }

  const nextMonth = addMonths(fromDate, 1);
  return buildCalendarDate({
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth(),
    day: day1,
    useEndOfMonthFallback: args.useEndOfMonthFallback,
  });
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
