import { Contract } from '@/server/api/contracts';
import { CategoryCodeSchema, categoryCodeLabels } from '@/schemas/category';
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

export const LOAN_APPLICATION_STATUS_OPTIONS = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELED',
] as const;
export type LoanApplicationStatus = (typeof LOAN_APPLICATION_STATUS_OPTIONS)[number];

export const BANK_ACCOUNT_TYPE_OPTIONS = ['SAVINGS', 'CHECKING'] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPE_OPTIONS)[number];

export const loanApplicationStatusLabels: Record<LoanApplicationStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELED: 'Cancelada',
};

export const bankAccountTypeLabels: Record<BankAccountType, string> = {
  SAVINGS: 'Ahorros',
  CHECKING: 'Corriente',
};

export { categoryCodeLabels };

const LoanApplicationWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    creditNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    creditFundId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    channelId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    applicationDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    affiliationOfficeId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    thirdPartyId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    categoryCode: z.union([CategoryCodeSchema, StringOperatorsSchema]).optional(),
    creditProductId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    installments: z.union([z.number(), NumberOperatorsSchema]).optional(),
    requestedAmount: z.union([z.string(), StringOperatorsSchema]).optional(),
    status: z.union([z.enum(LOAN_APPLICATION_STATUS_OPTIONS), StringOperatorsSchema]).optional(),
    pledgesSubsidy: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    isInsuranceApproved: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const LOAN_APPLICATION_SORT_FIELDS = [
  'id',
  'creditNumber',
  'status',
  'applicationDate',
  'thirdPartyId',
  'creditProductId',
  'requestedAmount',
  'createdAt',
  'updatedAt',
] as const;

const LOAN_APPLICATION_INCLUDE_OPTIONS = [
  'affiliationOffice',
  'creditFund',
  'thirdParty',
  'repaymentMethod',
  'bank',
  'creditProduct',
  'paymentFrequency',
  'insuranceCompany',
  'rejectionReason',
  'investmentType',
  'channel',
  'paymentGuaranteeType',
  'loanApplicationCoDebtors',
  'loanApplicationDocuments',
  'loanApplicationPledges',
  'loanApplicationStatusHistory',
  'loanApplicationRiskAssessments',
] as const;
const LoanApplicationIncludeSchema = createIncludeSchema(LOAN_APPLICATION_INCLUDE_OPTIONS);

export const ListLoanApplicationsQuerySchema = createListQuerySchema({
  whereFields: LoanApplicationWhereFieldsSchema,
  sortFields: LOAN_APPLICATION_SORT_FIELDS,
  includeFields: LOAN_APPLICATION_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListLoanApplicationsQuery = z.infer<typeof ListLoanApplicationsQuerySchema>;

export const GetLoanApplicationQuerySchema = z.object({
  include: LoanApplicationIncludeSchema,
});

export const ListLoanApplicationActNumbersQuerySchema = z.object({
  affiliationOfficeId: z.number().int().positive(),
  limit: z.number().int().positive().max(100).optional(),
});

function isValidDecimal(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (value.trim() === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function decimalStringField(message: string) {
  return z
    .string()
    .min(1, message)
    .refine((value) => isValidDecimal(value), { message: 'Valor numerico invalido' });
}

export const LoanApplicationCoDebtorInputSchema = z.object({
  thirdPartyId: z.number().int().positive(),
});

export type LoanApplicationCoDebtorInput = z.infer<typeof LoanApplicationCoDebtorInputSchema>;

export const LoanApplicationDocumentInputSchema = z.object({
  documentTypeId: z.number().int().positive(),
  isDelivered: z.boolean(),
  fileKey: z.string().max(512).nullable().optional(),
});

export type LoanApplicationDocumentInput = z.infer<typeof LoanApplicationDocumentInputSchema>;

export const LoanApplicationPledgeInputSchema = z.object({
  pledgeCode: z.string().min(1).max(20),
  documentNumber: z.string().max(20).nullable().optional(),
  beneficiaryCode: z.number().int().positive(),
  pledgedAmount: decimalStringField('Valor pignorado es requerido'),
  effectiveDate: z.coerce.date(),
});

export type LoanApplicationPledgeInput = z.infer<typeof LoanApplicationPledgeInputSchema>;

const LoanApplicationBaseSchema = z.object({
  channelId: z.number().int().positive(),
  applicationDate: z.coerce.date(),
  affiliationOfficeId: z.number().int().positive(),
  thirdPartyId: z.number().int().positive(),
  categoryCode: CategoryCodeSchema,
  repaymentMethodId: z.number().int().positive().nullable().optional(),
  paymentGuaranteeTypeId: z.number().int().positive().nullable().optional(),
  pledgesSubsidy: z.boolean(),
  salary: decimalStringField('Salario es requerido'),
  otherIncome: decimalStringField('Otros ingresos es requerido'),
  otherCredits: decimalStringField('Otros creditos es requerido'),
  paymentCapacity: decimalStringField('Capacidad de pago es requerida'),
  bankAccountNumber: z.string().min(1).max(25),
  bankAccountType: z.enum(BANK_ACCOUNT_TYPE_OPTIONS),
  bankId: z.number().int().positive(),
  creditProductId: z.number().int().positive(),
  paymentFrequencyId: z.number().int().positive().nullable().optional(),
  installments: z.number().int().positive(),
  insuranceCompanyId: z.number().int().positive().nullable().optional(),
  requestedAmount: decimalStringField('Valor solicitado es requerido'),
  investmentTypeId: z
    .number({ message: 'Tipo de inversion es requerido' })
    .int()
    .positive('Tipo de inversion es requerido'),
  note: z.string().nullable().optional(),
  isInsuranceApproved: z.boolean().optional(),
  creditStudyFee: decimalStringField('Estudio de credito invalido').nullable().optional(),
  loanApplicationCoDebtors: LoanApplicationCoDebtorInputSchema.array().optional(),
  loanApplicationDocuments: LoanApplicationDocumentInputSchema.array().optional(),
  loanApplicationPledges: LoanApplicationPledgeInputSchema.array().optional(),
});

const addLoanApplicationValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      pledgesSubsidy?: boolean;
      loanApplicationPledges?: {
        pledgeCode: string;
        beneficiaryCode: number;
      }[];
      loanApplicationCoDebtors?: {
        thirdPartyId: number;
      }[];
      loanApplicationDocuments?: {
        documentTypeId: number;
        isDelivered: boolean;
        fileKey?: string | null;
      }[];
    };

    if (
      data.pledgesSubsidy &&
      (!data.loanApplicationPledges || data.loanApplicationPledges.length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debe registrar al menos una pignoracion cuando aplica subsidio',
        path: ['loanApplicationPledges'],
      });
    }

    const coDebtors = data.loanApplicationCoDebtors ?? [];
    const coDebtorKeys = new Set<string>();
    for (const coDebtor of coDebtors) {
      const key = `${coDebtor.thirdPartyId}`;
      if (coDebtorKeys.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el mismo tercero',
          path: ['loanApplicationCoDebtors'],
        });
        break;
      }
      coDebtorKeys.add(key);
    }

    const docs = data.loanApplicationDocuments ?? [];
    const docTypes = new Set<number>();
    for (const doc of docs) {
      if (docTypes.has(doc.documentTypeId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el tipo de documento',
          path: ['loanApplicationDocuments'],
        });
        break;
      }
      if (doc.isDelivered && !doc.fileKey) {
        ctx.addIssue({
          code: 'custom',
          message: 'Debe indicar archivo cuando el documento fue entregado',
          path: ['loanApplicationDocuments'],
        });
      }
      docTypes.add(doc.documentTypeId);
    }

    const pledges = data.loanApplicationPledges ?? [];
    const pledgeKeys = new Set<string>();
    for (const pledge of pledges) {
      const key = `${pledge.pledgeCode}-${pledge.beneficiaryCode}`;
      if (pledgeKeys.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir la pignoracion para el mismo beneficiario',
          path: ['loanApplicationPledges'],
        });
        break;
      }
      pledgeKeys.add(key);
    }
  });

export const CreateLoanApplicationBodySchema =
  addLoanApplicationValidation(LoanApplicationBaseSchema);

export const UpdateLoanApplicationBodySchema = addLoanApplicationValidation(
  LoanApplicationBaseSchema.partial()
);

export const CancelLoanApplicationBodySchema = z.object({
  statusNote: z.string().min(1).max(1000),
});

export const RejectLoanApplicationBodySchema = z.object({
  statusNote: z.string().min(1).max(1000),
  rejectionReasonId: z.number().int().positive(),
});

export const ApproveLoanApplicationBodySchema = z.object({
  repaymentMethodId: z.number().int().positive(),
  paymentGuaranteeTypeId: z.number().int().positive(),
  agreementId: z.number().int().positive().nullable().optional(),
  approvedInstallments: z.number().int().positive(),
  approvedAmount: decimalStringField('Valor aprobado es requerido').refine(
    (value) => Number(value) > 0,
    { message: 'Valor aprobado debe ser mayor a cero' }
  ),
  actNumber: z.string().min(1).max(20),
  payeeThirdPartyId: z.number().int().positive(),
  firstCollectionDate: z.coerce.date(),
});

export const PresignLoanApplicationDocumentBodySchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
});

export const PresignLoanApplicationDocumentResponseSchema = z.object({
  fileKey: z.string(),
  uploadUrl: z.url(),
  method: z.literal('PUT'),
});

export const PresignLoanApplicationDocumentViewBodySchema = z.object({
  fileKey: z.string().min(1).max(512),
});

export const PresignLoanApplicationDocumentViewResponseSchema = z.object({
  viewUrl: z.url(),
  method: z.literal('GET'),
});

export type LoanApplicationPaginated = ClientInferResponseBody<
  Contract['loanApplication']['list'],
  200
>;

export type LoanApplication = LoanApplicationPaginated['data'][number];

export type LoanApplicationSortField = (typeof LOAN_APPLICATION_SORT_FIELDS)[number];
export type LoanApplicationInclude = (typeof LOAN_APPLICATION_INCLUDE_OPTIONS)[number];
export type LoanApplicationActNumbersList = ClientInferResponseBody<
  Contract['loanApplication']['listActNumbers'],
  200
>;
