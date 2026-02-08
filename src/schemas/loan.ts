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

export const LOAN_STATUS_OPTIONS = [
  'ACTIVE',
  'GENERATED',
  'INACTIVE',
  'ACCOUNTED',
  'VOID',
  'RELIQUIDATED',
  'FINISHED',
  'PAID',
] as const;
export type LoanStatus = (typeof LOAN_STATUS_OPTIONS)[number];

export const LOAN_DISBURSEMENT_STATUS_OPTIONS = [
  'LIQUIDATED',
  'SENT_TO_ACCOUNTING',
  'SENT_TO_BANK',
  'DISBURSED',
] as const;
export type LoanDisbursementStatus = (typeof LOAN_DISBURSEMENT_STATUS_OPTIONS)[number];

export const INSTALLMENT_RECORD_STATUS_OPTIONS = [
  'GENERATED',
  'ACCOUNTED',
  'VOID',
  'RELIQUIDATED',
  'INACTIVE',
] as const;
export type InstallmentRecordStatus = (typeof INSTALLMENT_RECORD_STATUS_OPTIONS)[number];

export const LOAN_PAYMENT_STATUS_OPTIONS = ['PAID', 'VOID'] as const;
export type LoanPaymentStatus = (typeof LOAN_PAYMENT_STATUS_OPTIONS)[number];

export const loanStatusLabels: Record<LoanStatus, string> = {
  ACTIVE: 'Activo',
  GENERATED: 'Generado',
  INACTIVE: 'Inactivo',
  ACCOUNTED: 'Contabilizado',
  VOID: 'Anulado',
  RELIQUIDATED: 'Reliquidado',
  FINISHED: 'Terminado',
  PAID: 'Pagado',
};

export const loanDisbursementStatusLabels: Record<LoanDisbursementStatus, string> = {
  LIQUIDATED: 'Liquidado',
  SENT_TO_ACCOUNTING: 'Enviado a contabilidad',
  SENT_TO_BANK: 'Enviado al banco',
  DISBURSED: 'Desembolsado',
};

export const installmentRecordStatusLabels: Record<InstallmentRecordStatus, string> = {
  GENERATED: 'Generada',
  ACCOUNTED: 'Contabilizada',
  VOID: 'Anulada',
  RELIQUIDATED: 'Reliquidada',
  INACTIVE: 'Inactiva',
};

export const loanPaymentStatusLabels: Record<LoanPaymentStatus, string> = {
  PAID: 'Pagado',
  VOID: 'Anulado',
};

const LoanWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    creditNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    loanApplicationId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    agreementId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    thirdPartyId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    payeeThirdPartyId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    status: z.union([z.enum(LOAN_STATUS_OPTIONS), StringOperatorsSchema]).optional(),
    disbursementStatus: z
      .union([z.enum(LOAN_DISBURSEMENT_STATUS_OPTIONS), StringOperatorsSchema])
      .optional(),
    recordDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    creditStartDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    maturityDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    principalAmount: z.union([z.string(), StringOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const LOAN_SORT_FIELDS = [
  'id',
  'creditNumber',
  'agreementId',
  'status',
  'recordDate',
  'creditStartDate',
  'maturityDate',
  'principalAmount',
  'createdAt',
  'updatedAt',
] as const;

const LOAN_INCLUDE_OPTIONS = [
  'loanApplication',
  'agreement',
  'creditFund',
  'repaymentMethod',
  'paymentFrequency',
  'paymentGuaranteeType',
  'affiliationOffice',
  'insuranceCompany',
  'costCenter',
  'borrower',
  'disbursementParty',
  'channel',
  'loanInstallments',
  'loanPayments',
  'loanAgreementHistory',
  'loanStatusHistory',
] as const;

const LoanIncludeSchema = createIncludeSchema(LOAN_INCLUDE_OPTIONS);

export const ListLoansQuerySchema = createListQuerySchema({
  whereFields: LoanWhereFieldsSchema,
  sortFields: LOAN_SORT_FIELDS,
  includeFields: LOAN_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListLoansQuery = z.infer<typeof ListLoansQuerySchema>;

export const GetLoanQuerySchema = z.object({
  include: LoanIncludeSchema,
});

export type LoanPaginated = ClientInferResponseBody<Contract['loan']['list'], 200>;
export type Loan = LoanPaginated['data'][number];

export type LoanSortField = (typeof LOAN_SORT_FIELDS)[number];
export type LoanInclude = (typeof LOAN_INCLUDE_OPTIONS)[number];
