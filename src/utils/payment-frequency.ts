import type { PaymentScheduleMode } from '@/schemas/payment-frequency';

export type PaymentFrequencyScheduleConfig = {
  scheduleMode: PaymentScheduleMode;
  intervalDays: number | null | undefined;
  dayOfMonth: number | null | undefined;
  semiMonthDay1: number | null | undefined;
  semiMonthDay2: number | null | undefined;
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
