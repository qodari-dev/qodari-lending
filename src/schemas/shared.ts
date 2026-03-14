import { z } from 'zod';

// ============================================
// PARAMS
// ============================================

export const IdParamSchema = z.object({
  id: z.coerce.number(),
});

export type IdParam = z.infer<typeof IdParamSchema>;

export const booleanOptions = [
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
] as const;

// ============================================
// DECIMAL STRING HELPERS
// ============================================

export function isValidDecimal(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (value.trim() === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

export function decimalStringField(message: string) {
  return z
    .string()
    .min(1, message)
    .refine((value) => isValidDecimal(value), { message: 'Valor numerico invalido' });
}
