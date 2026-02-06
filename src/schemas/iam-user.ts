import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const ListIamUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
  search: z.string().optional(),
});

export type ListIamUsersQuery = z.infer<typeof ListIamUsersQuerySchema>;

export const IamUserIdParamSchema = z.object({
  id: z.uuid(),
});

export const IamUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  status: z.enum(['active', 'suspended']),
  isAdmin: z.boolean(),
});

export const IamUsersMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const IamUsersResponseSchema = z.object({
  data: z.array(IamUserSchema),
  meta: IamUsersMetaSchema,
});

export type IamUsersResponse = ClientInferResponseBody<Contract['iamUser']['list'], 200>;
export type IamUser = ClientInferResponseBody<Contract['iamUser']['getById'], 200>;
