import { z } from 'zod';

export const CATEGORY_CODE_OPTIONS = ['A', 'B', 'C', 'D'] as const;

export type CategoryCode = (typeof CATEGORY_CODE_OPTIONS)[number];

export const CategoryCodeSchema = z.enum(CATEGORY_CODE_OPTIONS);

export const categoryCodeLabels: Record<CategoryCode, string> = {
  A: 'Categoria A',
  B: 'Categoria B',
  C: 'Categoria C',
  D: 'Particular',
};

export const categoryCodeSelectOptions = CATEGORY_CODE_OPTIONS.map((value) => ({
  value,
  label: categoryCodeLabels[value],
}));
