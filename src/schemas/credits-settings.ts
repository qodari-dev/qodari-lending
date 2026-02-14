import { Contract } from '@/server/api/contracts';
import { createIncludeSchema } from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// INCLUDE
// ============================================

const CREDITS_SETTINGS_INCLUDE_OPTIONS = [
  'cashGlAccount',
  'majorGlAccount',
  'excessGlAccount',
  'pledgeSubsidyGlAccount',
  'writeOffGlAccount',
  'defaultCostCenter',
] as const;

const CreditsSettingsIncludeSchema = createIncludeSchema(CREDITS_SETTINGS_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const GetCreditsSettingsQuerySchema = z.object({
  include: CreditsSettingsIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

const optionalNonNegativeDecimalString = z
  .string()
  .trim()
  .refine((value) => value.length > 0 && Number.isFinite(Number(value)), {
    message: 'Valor numerico invalido',
  })
  .refine((value) => Number(value) >= 0, {
    message: 'El valor debe ser mayor o igual a cero',
  })
  .nullable()
  .optional();

export const UpdateCreditsSettingsBodySchema = z.object({
  auditTransactionsEnabled: z.boolean().optional(),
  accountingSystemCode: z.string().max(2).optional(),
  postAccountingOnline: z.boolean().optional(),
  subsidyEnabled: z.boolean().optional(),
  accountingEnabled: z.boolean().optional(),
  minDaysBeforeFirstCollection: z.number().int().min(0).max(365).optional(),

  // GL Accounts
  cashGlAccountId: z.number().nullable().optional(),
  majorGlAccountId: z.number().nullable().optional(),
  minimumMajorPaidAmount: optionalNonNegativeDecimalString,
  excessGlAccountId: z.number().nullable().optional(),
  pledgeSubsidyGlAccountId: z.number().nullable().optional(),
  writeOffGlAccountId: z.number().nullable().optional(),

  // Cost Center
  defaultCostCenterId: z.number().nullable().optional(),

  // Signatures
  creditManagerName: z.string().max(50).nullable().optional(),
  creditManagerTitle: z.string().max(80).nullable().optional(),
  adminManagerName: z.string().max(50).nullable().optional(),
  adminManagerTitle: z.string().max(80).nullable().optional(),
  legalAdvisorName: z.string().max(50).nullable().optional(),
  legalAdvisorTitle: z.string().max(80).nullable().optional(),
  adminDirectorName: z.string().max(50).nullable().optional(),
  adminDirectorTitle: z.string().max(80).nullable().optional(),
  financeManagerName: z.string().max(50).nullable().optional(),
  financeManagerTitle: z.string().max(80).nullable().optional(),
});

// ============================================
// TYPES
// ============================================

export type CreditsSettings = ClientInferResponseBody<
  Contract['creditsSettings']['get'],
  200
>;

export type CreditsSettingsInclude = (typeof CREDITS_SETTINGS_INCLUDE_OPTIONS)[number];
