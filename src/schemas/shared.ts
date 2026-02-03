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
