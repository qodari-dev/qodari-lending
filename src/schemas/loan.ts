import { Contract } from '@/server/api/contracts';
import {
  BooleanOperatorsSchema,
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
    hasLegalProcess: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    legalProcessDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    hasPaymentAgreement: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    paymentAgreementDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
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
  'hasLegalProcess',
  'legalProcessDate',
  'hasPaymentAgreement',
  'paymentAgreementDate',
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

export const LiquidateLoanBodySchema = z.object({});
export const VoidLoanBodySchema = z.object({
  note: z.string().trim().min(5).max(255),
});
export const UpdateLoanLegalProcessBodySchema = z
  .object({
    hasLegalProcess: z.boolean(),
    legalProcessDate: z.coerce.date().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hasLegalProcess && !value.legalProcessDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['legalProcessDate'],
        message: 'Debe seleccionar la fecha del proceso juridico',
      });
    }
  });
export const UpdateLoanPaymentAgreementBodySchema = z
  .object({
    hasPaymentAgreement: z.boolean(),
    paymentAgreementDate: z.coerce.date().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hasPaymentAgreement && !value.paymentAgreementDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentAgreementDate'],
        message: 'Debe seleccionar la fecha del acuerdo de pago',
      });
    }
  });
export const GetLoanStatementQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type LoanBalanceByAccount = {
  glAccountId: number;
  glAccountCode: string | null;
  glAccountName: string | null;
  chargeAmount: string;
  paymentAmount: string;
  balance: string;
};

export type LoanBalanceSummary = {
  asOfDate: string;
  totalCharged: string;
  totalPaid: string;
  currentBalance: string;
  overdueBalance: string;
  currentDueBalance: string;
  openInstallments: number;
  nextDueDate: string | null;
  byAccount: LoanBalanceByAccount[];
};

export type LoanStatementEntry = {
  id: number;
  entryDate: string;
  processType: string;
  documentCode: string;
  sequence: number;
  sourceType: string;
  sourceLabel: string;
  sourceId: string;
  relatedPaymentNumber: string | null;
  glAccountId: number;
  glAccountCode: string | null;
  glAccountName: string | null;
  glAccountDetailType: 'RECEIVABLE' | 'PAYABLE' | 'NONE';
  description: string;
  nature: 'DEBIT' | 'CREDIT';
  amount: string;
  receivableDelta: string;
  runningBalance: string;
  installmentNumber: number | null;
  dueDate: string | null;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
};

export type LoanStatement = {
  from: string | null;
  to: string | null;
  openingBalance: string;
  closingBalance: string;
  entries: LoanStatementEntry[];
};

export type LoanPaginated = ClientInferResponseBody<Contract['loan']['list'], 200>;
export type Loan = LoanPaginated['data'][number];
export type LoanBalanceSummaryResponse = ClientInferResponseBody<
  Contract['loan']['getBalanceSummary'],
  200
>;
export type LoanStatementResponse = ClientInferResponseBody<Contract['loan']['getStatement'], 200>;

export type LoanSortField = (typeof LOAN_SORT_FIELDS)[number];
export type LoanInclude = (typeof LOAN_INCLUDE_OPTIONS)[number];
