import { Contract } from '@/server/api/contracts';
import {
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

const ProcessRunWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    processType: z.union([z.string(), StringOperatorsSchema]).optional(),
    scopeType: z.union([z.string(), StringOperatorsSchema]).optional(),
    scopeId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    accountingPeriodId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    processDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    transactionDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    triggerSource: z.union([z.string(), StringOperatorsSchema]).optional(),
    executedByUserId: z.union([z.string(), StringOperatorsSchema]).optional(),
    executedByUserName: z.union([z.string(), StringOperatorsSchema]).optional(),
    executedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    startedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    finishedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    status: z.union([z.string(), StringOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const PROCESS_RUN_SORT_FIELDS = [
  'id',
  'processType',
  'scopeType',
  'scopeId',
  'accountingPeriodId',
  'processDate',
  'transactionDate',
  'triggerSource',
  'executedByUserName',
  'executedAt',
  'startedAt',
  'finishedAt',
  'status',
  'createdAt',
  'updatedAt',
] as const;

const PROCESS_RUN_INCLUDE_OPTIONS = ['accountingPeriod'] as const;
const ProcessRunIncludeSchema = createIncludeSchema(PROCESS_RUN_INCLUDE_OPTIONS);

export const ListProcessRunsQuerySchema = createListQuerySchema({
  whereFields: ProcessRunWhereFieldsSchema,
  sortFields: PROCESS_RUN_SORT_FIELDS,
  includeFields: PROCESS_RUN_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListProcessRunsQuery = z.infer<typeof ListProcessRunsQuerySchema>;

export const GetProcessRunQuerySchema = z.object({
  include: ProcessRunIncludeSchema,
});

export type ProcessRunPaginated = ClientInferResponseBody<Contract['processRun']['list'], 200>;
export type ProcessRun = ProcessRunPaginated['data'][number];

export type ProcessRunSortField = (typeof PROCESS_RUN_SORT_FIELDS)[number];
export type ProcessRunInclude = (typeof PROCESS_RUN_INCLUDE_OPTIONS)[number];
