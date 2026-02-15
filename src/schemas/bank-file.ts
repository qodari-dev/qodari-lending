import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const GenerateBankFileBodySchema = z.object({
  bankId: z.number().int().positive(),
  liquidationDate: z.coerce.date(),
});

export const GenerateBankFileResponseSchema = z.object({
  bankId: z.number().int().positive(),
  bankName: z.string().min(1),
  bankCode: z.string().nullable(),
  liquidationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
  fileName: z.string().min(1),
  fileContent: z.string(),
  message: z.string(),
});

export type GenerateBankFileResult = ClientInferResponseBody<
  Contract['bankFile']['generate'],
  200
>;

