export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Resolve a calendar day, clamping to the last day of the month when needed.
 * When `useEndOfMonthFallback` is true and `day` exceeds the month's last day,
 * returns the last day. Otherwise returns `day` as-is.
 */
export function getCalendarDay(
  year: number,
  month: number,
  day: number,
  useEndOfMonthFallback: boolean
): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  if (day <= lastDay) return day;
  return useEndOfMonthFallback ? lastDay : day;
}

/**
 * Create a Date at the start of the given calendar day,
 * with end-of-month fallback handling.
 */
export function buildCalendarDate(
  year: number,
  month: number,
  day: number,
  useEndOfMonthFallback: boolean
): Date {
  return new Date(year, month, getCalendarDay(year, month, day, useEndOfMonthFallback));
}

export function isUpdatedToday(value: Date | string | null | undefined): boolean {
  if (!value) return false;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}
