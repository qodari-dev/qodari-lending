import { formatDateOnly } from './value-utils';

// ---------------------------------------------------------------------------
// pickApplicableBillingRule — selects the most recent active rule for a
// billing concept as-of a given date.
// ---------------------------------------------------------------------------

export type BillingRuleCandidate = {
  id: number;
  billingConceptId: number;
  rate: string | null;
  amount: string | null;
  valueFrom: string | null;
  valueTo: string | null;
  effectiveFrom: string | Date | null;
  effectiveTo: string | Date | null;
};

/**
 * Given a set of active billing-concept rules, pick the one that applies to
 * `conceptId` on `asOfDate`.  When multiple rules overlap the date range the
 * most recently-effective one wins (ties broken by highest id).
 */
export function pickApplicableBillingRule(args: {
  rules: BillingRuleCandidate[];
  conceptId: number;
  asOfDate: string;
}): BillingRuleCandidate | null {
  const toDateOnly = (value: string | Date | null) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return formatDateOnly(value);
  };

  const applicable = args.rules.filter((rule) => {
    if (rule.billingConceptId !== args.conceptId) return false;
    const effectiveFrom = toDateOnly(rule.effectiveFrom);
    const effectiveTo = toDateOnly(rule.effectiveTo);
    if (effectiveFrom && effectiveFrom > args.asOfDate) return false;
    if (effectiveTo && effectiveTo < args.asOfDate) return false;
    return true;
  });

  if (!applicable.length) return null;

  applicable.sort((a, b) => {
    const aFrom = toDateOnly(a.effectiveFrom) ?? '0000-01-01';
    const bFrom = toDateOnly(b.effectiveFrom) ?? '0000-01-01';
    if (bFrom !== aFrom) return bFrom.localeCompare(aFrom);
    return b.id - a.id;
  });

  return applicable[0] ?? null;
}
