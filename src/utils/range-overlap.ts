export function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

export function rangesOverlap(
  aFrom: number | null,
  aTo: number | null,
  bFrom: number | null,
  bTo: number | null
): boolean {
  if (aFrom === null || aTo === null || bFrom === null || bTo === null) return false;
  return aFrom <= bTo && bFrom <= aTo;
}

export function datesOverlap(
  aFrom: Date | string | null | undefined,
  aTo: Date | string | null | undefined,
  bFrom: Date | string | null | undefined,
  bTo: Date | string | null | undefined
): boolean {
  const aStart = toTime(aFrom) ?? Number.NEGATIVE_INFINITY;
  const aEnd = toTime(aTo) ?? Number.POSITIVE_INFINITY;
  const bStart = toTime(bFrom) ?? Number.NEGATIVE_INFINITY;
  const bEnd = toTime(bTo) ?? Number.POSITIVE_INFINITY;
  return aStart <= bEnd && bStart <= aEnd;
}
