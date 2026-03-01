// ============================================
// Date arithmetic helpers (server-side)
// ============================================

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function toMonthStart(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  };
}

export function toUtcDateStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toUtcDateEndInclusive(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
