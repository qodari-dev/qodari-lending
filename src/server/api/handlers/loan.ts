import {
  agreements,
  accountingDistributionLines,
  accountingEntries,
  banks,
  creditProductDocumentRules,
  db,
  loanApplications,
  loanApplicationRiskAssessments,
  loanApplicationStatusHistory,
  loanAgreementHistory,
  loanDisbursementEvents,
  loanBillingConcepts,
  loanDocumentInstances,
  loanInstallments,
  loanPayments,
  loanRefinancingLinks,
  signatureArtifacts,
  signatureEnvelopeDocuments,
  signatureEnvelopes,
  signatureEvents,
  signatureSigners,
  templateSignerRules,
  portfolioEntries,
  loans,
  loanStatusHistory,
} from '@/server/db';
import { createHash, randomUUID } from 'node:crypto';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { logAudit } from '@/server/utils/audit-logger';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { loadReactPdf } from '@/server/pdf/load-react-pdf';
import { buildLoanDocumentHbsContext } from '@/server/pdf/templates/loan-document-hbs-context';
import { renderHandlebarsTemplateToPdfBuffer } from '@/server/pdf/templates/loan-document-hbs-renderer';
import {
  getLoanDocumentTemplate,
  LoanDocumentData,
  LoanDocumentType,
} from '@/server/pdf/templates/loan-document-types';
import {
  buildLiquidationDocumentCode,
} from '@/server/utils/accounting-utils';
import { buildLoanLiquidationArtifacts } from '@/server/utils/loan-liquidation-artifacts';
import {
  ensureLoanExists,
  getLoanBalanceSummary,
  getLoanBalanceSummaryBatch,
  getLoanStatement,
} from '@/server/utils/loan-statement';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { recordLoanDisbursementEvent } from '@/server/utils/loan-disbursement-events';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import {
  buildDatedFileKey,
  createSpacesPresignedGetUrl,
} from '@/server/utils/storage/spaces-presign';
import {
  downloadBufferFromSpaces,
  uploadBufferToSpaces,
} from '@/server/utils/storage/spaces-object';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { getThirdPartyLabel } from '@/utils/third-party';
import { contract } from '../contracts';

type LoanColumn = keyof typeof loans.$inferSelect;

const LOAN_FIELDS: FieldMap = {
  id: loans.id,
  creditNumber: loans.creditNumber,
  loanApplicationId: loans.loanApplicationId,
  agreementId: loans.agreementId,
  thirdPartyId: loans.thirdPartyId,
  payeeThirdPartyId: loans.payeeThirdPartyId,
  bankId: loans.bankId,
  bankAccountType: loans.bankAccountType,
  bankAccountNumber: loans.bankAccountNumber,
  status: loans.status,
  disbursementStatus: loans.disbursementStatus,
  hasLegalProcess: loans.hasLegalProcess,
  legalProcessDate: loans.legalProcessDate,
  hasPaymentAgreement: loans.hasPaymentAgreement,
  paymentAgreementDate: loans.paymentAgreementDate,
  recordDate: loans.recordDate,
  creditStartDate: loans.creditStartDate,
  maturityDate: loans.maturityDate,
  principalAmount: loans.principalAmount,
  createdAt: loans.createdAt,
  updatedAt: loans.updatedAt,
} satisfies Partial<Record<LoanColumn, (typeof loans)[LoanColumn]>>;

const LOAN_QUERY_CONFIG: QueryConfig = {
  fields: LOAN_FIELDS,
  searchFields: [loans.creditNumber],
  defaultSort: { column: loans.createdAt, order: 'desc' },
};

const LOAN_INCLUDES = createIncludeMap<typeof db.query.loans>()({
  loanApplication: {
    relation: 'loanApplication',
    config: {
      with: {
        affiliationOffice: true,
        creditFund: true,
        thirdParty: true,
        repaymentMethod: true,
        bank: true,
        creditProduct: true,
        paymentFrequency: true,
        insuranceCompany: true,
        rejectionReason: true,
        investmentType: true,
        channel: true,
        paymentGuaranteeType: true,
        loanApplicationCoDebtors: {
          with: {
            thirdParty: {
              with: {
                identificationType: true,
                homeCity: true,
                workCity: true,
              },
            },
          },
        },
        loanApplicationDocuments: {
          with: {
            documentType: true,
          },
        },
        loanApplicationPledges: true,
        loanApplicationStatusHistory: {
          orderBy: [desc(loanApplicationStatusHistory.changedAt)],
        },
        loanApplicationRiskAssessments: {
          orderBy: [desc(loanApplicationRiskAssessments.executedAt)],
        },
      },
    },
  },
  agreement: {
    relation: 'agreement',
    config: true,
  },
  bank: {
    relation: 'bank',
    config: true,
  },
  creditFund: {
    relation: 'creditFund',
    config: true,
  },
  repaymentMethod: {
    relation: 'repaymentMethod',
    config: true,
  },
  paymentFrequency: {
    relation: 'paymentFrequency',
    config: true,
  },
  paymentGuaranteeType: {
    relation: 'paymentGuaranteeType',
    config: true,
  },
  affiliationOffice: {
    relation: 'affiliationOffice',
    config: true,
  },
  insuranceCompany: {
    relation: 'insuranceCompany',
    config: true,
  },
  costCenter: {
    relation: 'costCenter',
    config: true,
  },
  borrower: {
    relation: 'borrower',
    config: true,
  },
  disbursementParty: {
    relation: 'disbursementParty',
    config: true,
  },
  channel: {
    relation: 'channel',
    config: true,
  },
  loanInstallments: {
    relation: 'loanInstallments',
    config: {
      orderBy: [asc(loanInstallments.installmentNumber)],
    },
  },
  loanProcessStates: {
    relation: 'loanProcessStates',
    config: {
      with: {
        lastProcessRun: true,
      },
    },
  },
  loanPayments: {
    relation: 'loanPayments',
    config: {
      with: {
        paymentReceiptType: true,
        glAccount: true,
        loanPaymentMethodAllocations: {
          with: {
            collectionMethod: true,
          },
        },
      },
      orderBy: [desc(loanPayments.paymentDate), desc(loanPayments.id)],
    },
  },
  portfolioEntries: {
    relation: 'portfolioEntries',
    config: {
      with: {
        glAccount: true,
      },
      orderBy: [asc(portfolioEntries.dueDate), asc(portfolioEntries.installmentNumber)],
    },
  },
  accountingEntries: {
    relation: 'accountingEntries',
    config: {
      with: {
        glAccount: true,
      },
      orderBy: [
        desc(accountingEntries.entryDate),
        desc(accountingEntries.documentCode),
        desc(accountingEntries.sequence),
      ],
    },
  },
  loanAgreementHistory: {
    relation: 'loanAgreementHistory',
    config: {
      with: {
        agreement: true,
      },
      orderBy: [desc(loanAgreementHistory.changedAt)],
    },
  },
  loanDisbursementEvents: {
    relation: 'loanDisbursementEvents',
    config: {
      orderBy: [desc(loanDisbursementEvents.changedAt)],
    },
  },
  loanStatusHistory: {
    relation: 'loanStatusHistory',
    config: {
      orderBy: [desc(loanStatusHistory.changedAt)],
    },
  },
  loanBillingConcepts: {
    relation: 'loanBillingConcepts',
    config: {
      with: {
        billingConcept: true,
        glAccount: true,
        sourceBillingConceptRule: true,
      },
      orderBy: [asc(loanBillingConcepts.id)],
    },
  },
  loanDocumentInstances: {
    relation: 'loanDocumentInstances',
    config: {
      with: {
        documentTemplate: true,
        signatureArtifacts: true,
      },
      orderBy: [desc(loanDocumentInstances.generatedAt), desc(loanDocumentInstances.id)],
    },
  },
  signatureEnvelopes: {
    relation: 'signatureEnvelopes',
    config: {
      with: {
        signatureEnvelopeDocuments: {
          with: {
            loanDocumentInstance: {
              with: {
                documentTemplate: true,
              },
            },
          },
          orderBy: [asc(signatureEnvelopeDocuments.docOrder), asc(signatureEnvelopeDocuments.id)],
        },
        signatureSigners: {
          with: {
            thirdParty: true,
          },
          orderBy: [asc(signatureSigners.signOrder), asc(signatureSigners.id)],
        },
        signatureEvents: {
          orderBy: [desc(signatureEvents.receivedAt), desc(signatureEvents.id)],
        },
        signatureArtifacts: true,
      },
      orderBy: [desc(signatureEnvelopes.createdAt), desc(signatureEnvelopes.id)],
    },
  },
  loanRefinancingLinksRefinanced: {
    relation: 'loanRefinancingLinksRefinanced',
    config: {
      with: {
        referenceLoan: true,
      },
      orderBy: [desc(loanRefinancingLinks.createdAt)],
    },
  },
  loanRefinancingLinksReference: {
    relation: 'loanRefinancingLinksReference',
    config: {
      with: {
        refinancedLoan: true,
      },
      orderBy: [desc(loanRefinancingLinks.createdAt)],
    },
  },
});

type SignatureSignerRole =
  | 'BORROWER'
  | 'CO_DEBTOR'
  | 'SPOUSE'
  | 'EMPLOYER_REPRESENTATIVE'
  | 'ENTITY_OFFICER';

const TEMPLATE_CODE_TO_LOAN_DOCUMENT_TYPE: Record<string, LoanDocumentType> = {
  'plan-de-pagos': 'plan-de-pagos',
  plan_de_pagos: 'plan-de-pagos',
  planpagos: 'plan-de-pagos',
  pignoracion: 'pignoracion',
  pagare: 'pagare',
  'carta-instrucciones': 'carta-instrucciones',
  carta_instrucciones: 'carta-instrucciones',
  liquidacion: 'liquidacion',
  aceptacion: 'aceptacion',
  libranza: 'libranza',
};

function resolveLoanDocumentTypeFromTemplateCode(code: string): LoanDocumentType | null {
  const normalized = code.trim().toLowerCase().replace(/\s+/g, '-');
  return TEMPLATE_CODE_TO_LOAN_DOCUMENT_TYPE[normalized] ?? null;
}

function normalizeDocumentCode(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return normalized || fallback;
}

function toThirdPartySigner(
  thirdParty:
    | {
        id: number;
        personType: 'NATURAL' | 'LEGAL';
        businessName: string | null;
        firstName: string | null;
        secondName: string | null;
        firstLastName: string | null;
        secondLastName: string | null;
        documentNumber: string;
        email: string | null;
        mobilePhone: string | null;
        homePhone: string | null;
        workPhone: string | null;
        identificationType?: { code: string } | null;
      }
    | null
    | undefined
) {
  if (!thirdParty) return null;

  const fullName = getThirdPartyLabel(thirdParty).trim() || thirdParty.documentNumber;

  return {
    thirdPartyId: thirdParty.id,
    fullName,
    email: thirdParty.email ?? null,
    phone: thirdParty.mobilePhone ?? thirdParty.homePhone ?? thirdParty.workPhone ?? null,
    documentTypeCode: thirdParty.identificationType?.code ?? null,
    documentNumber: thirdParty.documentNumber ?? null,
  };
}

async function renderLoanDocumentBuffer(args: {
  template: {
    code: string;
    name: string;
    contentFormat: 'HTML_HBS' | 'PDF_STATIC';
    templateStorageKey: string | null;
    templateBody: string | null;
  };
  loan: LoanDocumentData['loan'];
  printDate: string;
}): Promise<Buffer> {
  const mappedType = resolveLoanDocumentTypeFromTemplateCode(args.template.code);

  if (mappedType) {
    const rpdf = await loadReactPdf();
    const templateBuilder = await getLoanDocumentTemplate(mappedType);
    const element = templateBuilder(
      {
        loan: args.loan,
        printDate: args.printDate,
      },
      rpdf
    );
    const blob = await rpdf.pdf(element).toBlob();
    return Buffer.from(await blob.arrayBuffer());
  }

  if (args.template.contentFormat === 'PDF_STATIC') {
    if (!args.template.templateStorageKey) {
      throwHttpError({
        status: 400,
        message: `La plantilla ${args.template.code} no tiene template_storage_key configurado`,
        code: 'BAD_REQUEST',
      });
    }
    return downloadBufferFromSpaces(args.template.templateStorageKey);
  }

  if (!args.template.templateBody) {
    throwHttpError({
      status: 400,
      message: `La plantilla ${args.template.code} no tiene template_body configurado`,
      code: 'BAD_REQUEST',
    });
  }

  const variables = buildLoanDocumentHbsContext({
    loan: args.loan,
    printDate: args.printDate,
  });

  return renderHandlebarsTemplateToPdfBuffer({
    templateBody: args.template.templateBody,
    variables,
    documentName: args.template.name,
    creditNumber: args.loan.creditNumber,
    printDate: variables.fecha_impresion ?? args.printDate,
  });
}

export const loan = tsr.router(contract.loan, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, LOAN_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.loans.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, LOAN_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(loans)
          .where(whereClause),
      ]);

      const totalCount = countResult[0]?.count ?? 0;

      return {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar creditos',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.loans.findFirst({
        where: eq(loans.id, id),
        with: buildTypedIncludes(query?.include, LOAN_INCLUDES),
      });

      if (!item) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return {
        status: 200 as const,
        body: item,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener credito ${id}`,
      });
    }
  },

  getBalanceSummary: async ({ params: { id } }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);
      await ensureLoanExists(id);

      const summary = await getLoanBalanceSummary(id);

      return {
        status: 200 as const,
        body: summary,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener saldo del credito ${id}`,
      });
    }
  },

  batchBalanceSummary: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const summaryMap = await getLoanBalanceSummaryBatch(query.loanIds);
      const result: Record<string, Awaited<ReturnType<typeof getLoanBalanceSummary>>> = {};
      for (const [loanId, summary] of summaryMap) {
        result[String(loanId)] = summary;
      }

      return {
        status: 200 as const,
        body: result,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al obtener saldos en lote',
      });
    }
  },

  getStatement: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);
      await ensureLoanExists(id);

      const statement = await getLoanStatement(id, query ?? {});

      return {
        status: 200 as const,
        body: statement,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener extracto del credito ${id}`,
      });
    }
  },

  sendToSignature: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const loanForSignature = await db.query.loans.findFirst({
        where: eq(loans.id, id),
        with: {
          borrower: {
            with: {
              identificationType: true,
            },
          },
          disbursementParty: {
            with: {
              identificationType: true,
            },
          },
          agreement: true,
          affiliationOffice: true,
          loanApplication: {
            with: {
              creditProduct: true,
              loanApplicationCoDebtors: {
                with: {
                  thirdParty: {
                    with: {
                      identificationType: true,
                    },
                  },
                },
              },
            },
          },
          loanInstallments: {
            orderBy: [asc(loanInstallments.installmentNumber)],
          },
        },
      });

      if (!loanForSignature) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (loanForSignature.status !== 'GENERATED') {
        throwHttpError({
          status: 400,
          message: 'Solo se pueden enviar a firma creditos en estado generado',
          code: 'BAD_REQUEST',
        });
      }

      if (!loanForSignature.loanApplication?.creditProduct) {
        throwHttpError({
          status: 404,
          message: 'No se encontro la linea de credito asociada al credito',
          code: 'NOT_FOUND',
        });
      }

      const openEnvelope = await db.query.signatureEnvelopes.findFirst({
        where: and(
          eq(signatureEnvelopes.loanId, id),
          inArray(signatureEnvelopes.status, ['DRAFT', 'SENT', 'PARTIALLY_SIGNED'])
        ),
        columns: {
          id: true,
          status: true,
        },
      });

      if (openEnvelope) {
        throwHttpError({
          status: 409,
          message: `El credito ya tiene un sobre de firma en proceso (ID ${openEnvelope.id})`,
          code: 'CONFLICT',
        });
      }

      const documentRules = await db.query.creditProductDocumentRules.findMany({
        where: eq(
          creditProductDocumentRules.creditProductId,
          loanForSignature.loanApplication.creditProduct.id
        ),
        with: {
          documentTemplate: {
            with: {
              templateSignerRules: {
                orderBy: [asc(templateSignerRules.signOrder)],
              },
            },
          },
        },
        orderBy: [asc(creditProductDocumentRules.documentOrder)],
      });

      if (!documentRules.length) {
        throwHttpError({
          status: 400,
          message: 'La linea de credito no tiene plantillas de firma configuradas',
          code: 'BAD_REQUEST',
        });
      }

      const rulesWithTemplates = documentRules.filter(
        (rule): rule is typeof rule & { documentTemplate: NonNullable<typeof rule.documentTemplate> } =>
          Boolean(rule.documentTemplate)
      );

      const hasBorrowerTemplate = rulesWithTemplates.some((rule) =>
        rule.documentTemplate.templateSignerRules.some((signerRule) => signerRule.signerRole === 'BORROWER')
      );
      if (!hasBorrowerTemplate) {
        throwHttpError({
          status: 400,
          message: 'La linea de credito no tiene plantillas de firma para el titular (BORROWER)',
          code: 'BAD_REQUEST',
        });
      }

      const signerRulesByRole = new Map<
        SignatureSignerRole,
        { signOrder: number; required: boolean }
      >();

      for (const rule of rulesWithTemplates) {
        if (rule.documentTemplate.status !== 'ACTIVE') {
          throwHttpError({
            status: 400,
            message: `La plantilla ${rule.documentTemplate.code} v${rule.documentTemplate.version} no esta activa`,
            code: 'BAD_REQUEST',
          });
        }

        if (
          rule.documentTemplate.contentFormat === 'PDF_STATIC' &&
          !rule.documentTemplate.templateStorageKey
        ) {
          throwHttpError({
            status: 400,
            message: `La plantilla PDF estática ${rule.documentTemplate.code} v${rule.documentTemplate.version} no tiene archivo configurado (template_storage_key)`,
            code: 'BAD_REQUEST',
          });
        }

        if (
          rule.documentTemplate.contentFormat === 'HTML_HBS' &&
          !rule.documentTemplate.templateBody
        ) {
          // Only validate if template code doesn't map to a built-in React template
          const mappedType = resolveLoanDocumentTypeFromTemplateCode(rule.documentTemplate.code);
          if (!mappedType) {
            throwHttpError({
              status: 400,
              message: `La plantilla HTML/HBS ${rule.documentTemplate.code} v${rule.documentTemplate.version} no tiene contenido (template_body)`,
              code: 'BAD_REQUEST',
            });
          }
        }

        for (const signerRule of rule.documentTemplate.templateSignerRules) {
          const role = signerRule.signerRole as SignatureSignerRole;
          const current = signerRulesByRole.get(role);
          if (!current) {
            signerRulesByRole.set(role, {
              signOrder: signerRule.signOrder,
              required: signerRule.required,
            });
            continue;
          }

          signerRulesByRole.set(role, {
            signOrder: Math.min(current.signOrder, signerRule.signOrder),
            required: current.required || signerRule.required,
          });
        }
      }

      if (signerRulesByRole.size === 0) {
        throwHttpError({
          status: 400,
          message: 'Las plantillas configuradas no tienen reglas de firmantes',
          code: 'BAD_REQUEST',
        });
      }

      const coDebtorParties = loanForSignature.loanApplication.loanApplicationCoDebtors
        .map((item) => item.thirdParty)
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const borrowerSigner = toThirdPartySigner(loanForSignature.borrower);
      const coDebtorSigners = coDebtorParties
        .map((party) => toThirdPartySigner(party))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const disbursementSigner = toThirdPartySigner(loanForSignature.disbursementParty);

      const { userId, userName } = getRequiredUserContext(session);
      const entityOfficerSigner = {
        thirdPartyId: null,
        fullName: userName || userId,
        email: session.type === 'user' ? (session.user?.email ?? null) : null,
        phone: null,
        documentTypeCode: null,
        documentNumber: null,
      };

      // Track which co-debtors have been assigned to avoid assigning the same
      // person to both CO_DEBTOR and SPOUSE roles.
      const usedCoDebtorIndexes = new Set<number>();

      const signerPayload = Array.from(signerRulesByRole.entries())
        .sort((a, b) => a[1].signOrder - b[1].signOrder)
        .flatMap(([role, config]) => {
          let signer:
            | {
                thirdPartyId: number | null;
                fullName: string;
                email: string | null;
                phone: string | null;
                documentTypeCode: string | null;
                documentNumber: string | null;
              }
            | null = null;

          switch (role) {
            case 'BORROWER':
              signer = borrowerSigner;
              break;
            case 'CO_DEBTOR':
            case 'SPOUSE': {
              // Assign the next available co-debtor that hasn't been used yet.
              const idx = coDebtorSigners.findIndex((_, i) => !usedCoDebtorIndexes.has(i));
              if (idx >= 0) {
                usedCoDebtorIndexes.add(idx);
                signer = coDebtorSigners[idx] ?? null;
              }
              break;
            }
            case 'EMPLOYER_REPRESENTATIVE':
              signer = disbursementSigner;
              break;
            case 'ENTITY_OFFICER':
              signer = entityOfficerSigner;
              break;
          }

          if (!signer) {
            if (config.required) {
              throwHttpError({
                status: 400,
                message: `No hay informacion disponible para el firmante requerido con rol ${role}`,
                code: 'BAD_REQUEST',
              });
            }
            return [];
          }

          return [
            {
              signerRole: role,
              signOrder: config.signOrder,
              required: config.required,
              ...signer,
            },
          ];
        });

      if (!signerPayload.length) {
        throwHttpError({
          status: 400,
          message: 'No se pudo resolver ningun firmante para el sobre',
          code: 'BAD_REQUEST',
        });
      }

      const existingRevisions = await db.query.loanDocumentInstances.findMany({
        where: eq(loanDocumentInstances.loanId, id),
        columns: {
          documentCode: true,
          revision: true,
        },
      });
      const revisionMap = new Map<string, number>();
      for (const row of existingRevisions) {
        const current = revisionMap.get(row.documentCode) ?? 0;
        revisionMap.set(row.documentCode, Math.max(current, row.revision));
      }

      const printDate = formatDateOnly(new Date());
      const sentAt = new Date();

      const documentsToInsert: Array<typeof loanDocumentInstances.$inferInsert & { documentOrder: number }> =
        [];

      for (const rule of rulesWithTemplates) {
        const template = rule.documentTemplate;
        const documentCode = normalizeDocumentCode(template.code, `doc-${template.id}`);
        const nextRevision = (revisionMap.get(documentCode) ?? 0) + 1;
        revisionMap.set(documentCode, nextRevision);

        const pdfBuffer = await renderLoanDocumentBuffer({
          template: {
            code: template.code,
            name: template.name,
            contentFormat: template.contentFormat,
            templateStorageKey: template.templateStorageKey ?? null,
            templateBody: template.templateBody ?? null,
          },
          loan: loanForSignature as unknown as LoanDocumentData['loan'],
          printDate,
        });
        const unsignedSha256 = createHash('sha256').update(pdfBuffer).digest('hex');
        const unsignedStorageKey = buildDatedFileKey(
          `loan-documents/unsigned/${loanForSignature.id}`,
          `${documentCode}-v${template.version}-r${nextRevision}.pdf`
        );

        await uploadBufferToSpaces(unsignedStorageKey, pdfBuffer, 'application/pdf');
        documentsToInsert.push({
          loanId: loanForSignature.id,
          documentTemplateId: template.id,
          documentTemplateVersion: template.version,
          revision: nextRevision,
          documentCode,
          documentName: template.name,
          status: 'SENT_FOR_SIGNATURE',
          unsignedStorageKey,
          unsignedSha256,
          sentForSignatureAt: sentAt,
          documentOrder: rule.documentOrder,
        });
      }

      const providerEnvelopeId = `sim-${loanForSignature.id}-${randomUUID()}`;
      const [envelopeCreated] = await db.transaction(async (tx) => {
        const insertedDocuments = await tx
          .insert(loanDocumentInstances)
          .values(
            documentsToInsert.map(({ documentOrder: _documentOrder, ...item }) => item)
          )
          .returning({
            id: loanDocumentInstances.id,
            documentTemplateId: loanDocumentInstances.documentTemplateId,
          });

        const [envelope] = await tx
          .insert(signatureEnvelopes)
          .values({
            loanId: loanForSignature.id,
            provider: 'CUSTOM',
            providerEnvelopeId,
            status: 'SENT',
            sentAt,
          })
          .returning();

        const documentInstanceByTemplateId = new Map<number, number>();
        for (const item of insertedDocuments) {
          documentInstanceByTemplateId.set(item.documentTemplateId, item.id);
        }

        await tx.insert(signatureEnvelopeDocuments).values(
          documentsToInsert.map((item) => {
            const loanDocumentInstanceId = documentInstanceByTemplateId.get(item.documentTemplateId);
            if (!loanDocumentInstanceId) {
              throwHttpError({
                status: 500,
                message: 'No fue posible enlazar documentos de firma',
                code: 'INTERNAL_ERROR',
              });
            }
            return {
              signatureEnvelopeId: envelope.id,
              loanDocumentInstanceId,
              docOrder: item.documentOrder,
            };
          })
        );

        await tx.insert(signatureSigners).values(
          signerPayload.map((signer) => ({
            signatureEnvelopeId: envelope.id,
            signerRole: signer.signerRole,
            signOrder: signer.signOrder,
            required: signer.required,
            thirdPartyId: signer.thirdPartyId,
            fullName: signer.fullName,
            email: signer.email,
            phone: signer.phone,
            documentTypeCode: signer.documentTypeCode,
            documentNumber: signer.documentNumber,
            status: 'SENT' as const,
          }))
        );

        await tx.insert(signatureEvents).values({
          signatureEnvelopeId: envelope.id,
          provider: 'CUSTOM',
          providerEventId: `sim-event-${envelope.id}-sent`,
          eventType: 'ENVELOPE_SENT_SIMULATED',
          eventAt: sentAt,
          payload: {
            simulated: true,
            note: 'Proveedor simulado temporalmente mientras se define integracion real',
            loanId: loanForSignature.id,
            envelopeId: envelope.id,
            documents: documentsToInsert.length,
            signers: signerPayload.length,
          },
          webhookSignatureValid: true,
          processed: true,
          processedAt: sentAt,
          triggeredByUserId: userId,
          triggeredByUserName: userName || userId,
        });

        // TODO(signature-provider): crear sobre y enviar documentos al proveedor real via API.

        return [envelope];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'sendToSignature',
        resourceId: id.toString(),
        resourceLabel: loanForSignature.creditNumber,
        status: 'success',
        beforeValue: {
          id: loanForSignature.id,
          status: loanForSignature.status,
          disbursementStatus: loanForSignature.disbursementStatus,
        },
        afterValue: {
          id: loanForSignature.id,
          status: loanForSignature.status,
          disbursementStatus: loanForSignature.disbursementStatus,
        },
        metadata: {
          provider: 'CUSTOM',
          providerEnvelopeId,
          signatureEnvelopeId: envelopeCreated.id,
          documentsGenerated: documentsToInsert.length,
          signersResolved: signerPayload.length,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: loanForSignature,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al enviar credito ${id} a firma digital`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'sendToSignature',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  presignSignatureFileView: async ({ params: { id }, body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
        columns: {
          id: true,
        },
      });
      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const fileKey = body.fileKey.trim();

      const [relatedDocument, relatedArtifact] = await Promise.all([
        db.query.loanDocumentInstances.findFirst({
          where: and(
            eq(loanDocumentInstances.loanId, id),
            or(
              eq(loanDocumentInstances.unsignedStorageKey, fileKey),
              eq(loanDocumentInstances.signedStorageKey, fileKey)
            )
          ),
          columns: {
            id: true,
          },
        }),
        db.query.signatureArtifacts.findFirst({
          where: eq(signatureArtifacts.storageKey, fileKey),
          with: {
            signatureEnvelope: {
              columns: {
                loanId: true,
              },
            },
            loanDocumentInstance: {
              columns: {
                loanId: true,
              },
            },
          },
        }),
      ]);
      const artifactBelongsToLoan =
        relatedArtifact?.signatureEnvelope?.loanId === id ||
        relatedArtifact?.loanDocumentInstance?.loanId === id;

      if (!relatedDocument && !artifactBelongsToLoan) {
        throwHttpError({
          status: 404,
          message: 'No se encontro un archivo de firma digital asociado al credito',
          code: 'NOT_FOUND',
        });
      }

      const viewUrl = createSpacesPresignedGetUrl(fileKey, 900);

      return {
        status: 200 as const,
        body: {
          viewUrl,
          method: 'GET' as const,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al generar URL de descarga de firma del credito ${id}`,
      });
    }
  },

  resendSignatureEnvelope: async (
    { params: { id, envelopeId }, body },
    { request, appRoute, nextRequest }
  ) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
        columns: {
          id: true,
          creditNumber: true,
        },
      });
      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingEnvelope = await db.query.signatureEnvelopes.findFirst({
        where: and(eq(signatureEnvelopes.id, envelopeId), eq(signatureEnvelopes.loanId, id)),
      });
      if (!existingEnvelope) {
        throwHttpError({
          status: 404,
          message: `Sobre de firma con ID ${envelopeId} no encontrado para el credito ${id}`,
          code: 'NOT_FOUND',
        });
      }

      const now = new Date();
      const { userId, userName } = getRequiredUserContext(session);
      const isReminderAction = body.action === 'REMINDER';
      const isRetryAction = body.action === 'RETRY';
      if (
        isReminderAction &&
        existingEnvelope.status !== 'SENT' &&
        existingEnvelope.status !== 'PARTIALLY_SIGNED'
      ) {
        throwHttpError({
          status: 409,
          message: 'Solo se puede enviar recordatorio en sobres enviados o parcialmente firmados',
          code: 'CONFLICT',
        });
      }
      if (isRetryAction && existingEnvelope.status !== 'ERROR') {
        throwHttpError({
          status: 409,
          message: 'Solo se puede reintentar cuando el sobre esta en error',
          code: 'CONFLICT',
        });
      }

      const eventType = isRetryAction
        ? 'ENVELOPE_RETRY_REQUESTED_SIMULATED'
        : 'ENVELOPE_REMINDER_SENT_SIMULATED';

      const [updatedEnvelope] = await db.transaction(async (tx) => {
        const [envelopeUpdated] = isRetryAction
          ? await tx
              .update(signatureEnvelopes)
              .set({
                status: 'SENT',
                sentAt: now,
                errorMessage: null,
              })
              .where(eq(signatureEnvelopes.id, envelopeId))
              .returning()
          : await tx
              .update(signatureEnvelopes)
              .set({
                updatedAt: now,
              })
              .where(eq(signatureEnvelopes.id, envelopeId))
              .returning();

        if (!envelopeUpdated) {
          throwHttpError({
            status: 500,
            message: 'No fue posible actualizar el sobre de firma',
            code: 'INTERNAL_ERROR',
          });
        }

        await tx.insert(signatureEvents).values({
          signatureEnvelopeId: envelopeUpdated.id,
          provider: envelopeUpdated.provider,
          providerEventId: `sim-event-${envelopeUpdated.id}-${randomUUID()}`,
          eventType,
          eventAt: now,
          payload: {
            simulated: true,
            loanId: id,
            envelopeId: envelopeUpdated.id,
            previousStatus: existingEnvelope.status,
            currentStatus: envelopeUpdated.status,
            note: isRetryAction
              ? 'TODO: reintento de envio al proveedor real'
              : 'TODO: envio de recordatorio al proveedor real',
          },
          webhookSignatureValid: true,
          processed: true,
          processedAt: now,
          triggeredByUserId: userId,
          triggeredByUserName: userName || userId,
        });

        return [envelopeUpdated];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'resendSignatureEnvelope',
        resourceId: id.toString(),
        resourceLabel: existingLoan.creditNumber,
        status: 'success',
        beforeValue: {
          envelopeId: existingEnvelope.id,
          status: existingEnvelope.status,
          sentAt: existingEnvelope.sentAt,
          errorMessage: existingEnvelope.errorMessage,
        },
        afterValue: {
          envelopeId: updatedEnvelope.id,
          status: updatedEnvelope.status,
          sentAt: updatedEnvelope.sentAt,
          errorMessage: updatedEnvelope.errorMessage,
        },
        metadata: {
          action: body.action,
          eventType,
          provider: updatedEnvelope.provider,
          providerEnvelopeId: updatedEnvelope.providerEnvelopeId,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: {
          envelopeId: updatedEnvelope.id,
          action: body.action,
          status: updatedEnvelope.status,
          eventType,
          sentAt: updatedEnvelope.sentAt ?? now,
        },
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al reenviar sobre de firma ${envelopeId} del credito ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'resendSignatureEnvelope',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          envelopeId,
          action: body.action,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  void: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (existingLoan.status === 'VOID') {
        throwHttpError({
          status: 409,
          message: 'El credito ya se encuentra anulado',
          code: 'CONFLICT',
        });
      }

      if (existingLoan.status === 'PAID') {
        throwHttpError({
          status: 400,
          message: 'No se puede anular un credito pagado',
          code: 'BAD_REQUEST',
        });
      }

      if (existingLoan.disbursementStatus === 'DISBURSED') {
        throwHttpError({
          status: 400,
          message: 'No se puede anular un credito ya desembolsado',
          code: 'BAD_REQUEST',
        });
      }

      const paidLoanPayment = await db.query.loanPayments.findFirst({
        where: and(eq(loanPayments.loanId, id), eq(loanPayments.status, 'PAID')),
        columns: { id: true },
      });

      if (paidLoanPayment) {
        throwHttpError({
          status: 400,
          message: 'No se puede anular un credito con abonos registrados',
          code: 'BAD_REQUEST',
        });
      }

      const statusDate = formatDateOnly(new Date());
      const { userId, userName } = getRequiredUserContext(session);

      const [updatedLoan] = await db.transaction(async (tx) => {
        // Re-read inside tx for consistent fromStatus
        const current = await tx.query.loans.findFirst({
          where: eq(loans.id, id),
          columns: { id: true, status: true },
        });

        if (!current || current.status === 'VOID') {
          throwHttpError({
            status: 409,
            message: 'El estado del credito cambio durante la anulacion, intente de nuevo',
            code: 'CONFLICT',
          });
        }

        // Void accounting entries if they exist
        await tx
          .update(accountingEntries)
          .set({ status: 'VOIDED', statusDate })
          .where(
            and(
              eq(accountingEntries.loanId, id),
              inArray(accountingEntries.status, ['DRAFT', 'ACCOUNTED'])
            )
          );

        // Reverse portfolio entries if they exist
        const existingPortfolioEntries = await tx.query.portfolioEntries.findMany({
          where: eq(portfolioEntries.loanId, id),
        });

        if (existingPortfolioEntries.length) {
          await applyPortfolioDeltas(tx, {
            movementDate: statusDate,
            deltas: existingPortfolioEntries.map((entry) => ({
              glAccountId: entry.glAccountId,
              thirdPartyId: entry.thirdPartyId,
              loanId: entry.loanId,
              installmentNumber: entry.installmentNumber,
              dueDate: entry.dueDate,
              chargeDelta: -toNumber(entry.chargeAmount),
              paymentDelta: -toNumber(entry.paymentAmount),
            })),
          });
        }

        await tx
          .update(loanInstallments)
          .set({ status: 'VOID' })
          .where(
            and(
              eq(loanInstallments.loanId, id),
              inArray(loanInstallments.status, ['GENERATED', 'ACCOUNTED', 'REFINANCED', 'CAUSED'])
            )
          );

        const [loanUpdated] = await tx
          .update(loans)
          .set({
            status: 'VOID',
            statusDate,
            statusChangedByUserId: userId,
            statusChangedByUserName: userName || userId,
            note: body.note,
          })
          .where(and(eq(loans.id, id), sql`${loans.status} <> 'VOID'`))
          .returning();

        if (!loanUpdated) {
          throwHttpError({
            status: 409,
            message: 'El estado del credito cambio durante la anulacion, intente de nuevo',
            code: 'CONFLICT',
          });
        }

        await tx.insert(loanStatusHistory).values({
          loanId: id,
          fromStatus: current.status,
          toStatus: 'VOID',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: body.note,
          metadata: {
            operation: 'VOID_LOAN',
            reversedPortfolioEntries: existingPortfolioEntries.length,
          },
        });

        return [loanUpdated];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'void',
        resourceId: id.toString(),
        resourceLabel: existingLoan.creditNumber,
        status: 'success',
        beforeValue: existingLoan,
        afterValue: updatedLoan,
        metadata: {
          note: body.note,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updatedLoan,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al anular credito ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'void',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          note: body.note,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  updateLegalProcess: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (existingLoan.status === 'VOID' || existingLoan.status === 'PAID') {
        throwHttpError({
          status: 400,
          message: 'No se puede modificar un credito en estado anulado o pagado',
          code: 'BAD_REQUEST',
        });
      }

      if (body.hasLegalProcess && !body.legalProcessDate) {
        throwHttpError({
          status: 400,
          message: 'Debe indicar la fecha del proceso juridico',
          code: 'BAD_REQUEST',
        });
      }

      const legalProcessDate = body.hasLegalProcess
        ? formatDateOnly(body.legalProcessDate ?? new Date())
        : null;

      const [updatedLoan] = await db
        .update(loans)
        .set({
          hasLegalProcess: body.hasLegalProcess,
          legalProcessDate,
        })
        .where(eq(loans.id, id))
        .returning();

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updateLegalProcess',
        resourceId: id.toString(),
        resourceLabel: existingLoan.creditNumber,
        status: 'success',
        beforeValue: existingLoan,
        afterValue: updatedLoan,
        metadata: {
          hasLegalProcess: updatedLoan.hasLegalProcess,
          legalProcessDate: updatedLoan.legalProcessDate,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updatedLoan,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar proceso juridico del credito ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updateLegalProcess',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          requestedHasLegalProcess: body.hasLegalProcess,
          requestedLegalProcessDate: body.legalProcessDate
            ? formatDateOnly(body.legalProcessDate)
            : null,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  updatePaymentAgreement: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (existingLoan.status === 'VOID' || existingLoan.status === 'PAID') {
        throwHttpError({
          status: 400,
          message: 'No se puede modificar un credito en estado anulado o pagado',
          code: 'BAD_REQUEST',
        });
      }

      if (body.hasPaymentAgreement && !body.paymentAgreementDate) {
        throwHttpError({
          status: 400,
          message: 'Debe indicar la fecha del acuerdo de pago',
          code: 'BAD_REQUEST',
        });
      }

      const paymentAgreementDate = body.hasPaymentAgreement
        ? formatDateOnly(body.paymentAgreementDate ?? new Date())
        : null;

      const [updatedLoan] = await db
        .update(loans)
        .set({
          hasPaymentAgreement: body.hasPaymentAgreement,
          paymentAgreementDate,
        })
        .where(eq(loans.id, id))
        .returning();

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updatePaymentAgreement',
        resourceId: id.toString(),
        resourceLabel: existingLoan.creditNumber,
        status: 'success',
        beforeValue: existingLoan,
        afterValue: updatedLoan,
        metadata: {
          hasPaymentAgreement: updatedLoan.hasPaymentAgreement,
          paymentAgreementDate: updatedLoan.paymentAgreementDate,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updatedLoan,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar acuerdo de pago del credito ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updatePaymentAgreement',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          requestedHasPaymentAgreement: body.hasPaymentAgreement,
          requestedPaymentAgreementDate: body.paymentAgreementDate
            ? formatDateOnly(body.paymentAgreementDate)
            : null,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  updateBankInfo: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (existingLoan.status === 'VOID' || existingLoan.status === 'PAID') {
        throwHttpError({
          status: 400,
          message: 'No se puede modificar un credito en estado anulado o pagado',
          code: 'BAD_REQUEST',
        });
      }

      const bank = await db.query.banks.findFirst({
        where: and(eq(banks.id, body.bankId), eq(banks.isActive, true)),
        columns: {
          id: true,
          name: true,
        },
      });

      if (!bank) {
        throwHttpError({
          status: 400,
          message: 'Banco invalido o inactivo',
          code: 'BAD_REQUEST',
        });
      }

      const [updatedLoan] = await db
        .update(loans)
        .set({
          bankId: body.bankId,
          bankAccountType: body.bankAccountType,
          bankAccountNumber: body.bankAccountNumber.trim(),
        })
        .where(eq(loans.id, id))
        .returning();

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updateBankInfo',
        resourceId: id.toString(),
        resourceLabel: existingLoan.creditNumber,
        status: 'success',
        beforeValue: existingLoan,
        afterValue: updatedLoan,
        metadata: {
          bankName: bank.name,
          bankId: updatedLoan.bankId,
          bankAccountType: updatedLoan.bankAccountType,
          bankAccountNumber: updatedLoan.bankAccountNumber,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updatedLoan,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar datos bancarios del credito ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updateBankInfo',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          requestedBankId: body.bankId,
          requestedBankAccountType: body.bankAccountType,
          requestedBankAccountNumber: body.bankAccountNumber,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  updateAgreement: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (existingLoan.status === 'VOID' || existingLoan.status === 'PAID') {
        throwHttpError({
          status: 400,
          message: 'No se puede modificar un credito en estado anulado o pagado',
          code: 'BAD_REQUEST',
        });
      }

      if (existingLoan.agreementId === body.agreementId) {
        throwHttpError({
          status: 400,
          message: 'El credito ya tiene asignado ese convenio',
          code: 'BAD_REQUEST',
        });
      }

      const agreement = await db.query.agreements.findFirst({
        where: and(eq(agreements.id, body.agreementId), eq(agreements.isActive, true)),
        columns: {
          id: true,
          agreementCode: true,
          businessName: true,
        },
      });

      if (!agreement) {
        throwHttpError({
          status: 400,
          message: 'Convenio invalido o inactivo',
          code: 'BAD_REQUEST',
        });
      }

      const { userId, userName } = getRequiredUserContext(session);
      const effectiveDate = formatDateOnly(new Date());
      const [updatedLoan] = await db.transaction(async (tx) => {
        const [loanUpdated] = await tx
          .update(loans)
          .set({
            agreementId: body.agreementId,
          })
          .where(eq(loans.id, id))
          .returning();

        if (!loanUpdated) {
          throwHttpError({
            status: 404,
            message: `Credito con ID ${id} no encontrado`,
            code: 'NOT_FOUND',
          });
        }

        await tx.insert(loanAgreementHistory).values({
          loanId: id,
          agreementId: body.agreementId,
          effectiveDate,
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Convenio actualizado desde captura de creditos',
          metadata: {
            operation: 'UPDATE_LOAN_AGREEMENT',
            previousAgreementId: existingLoan.agreementId,
            newAgreementId: body.agreementId,
          },
        });

        return [loanUpdated];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updateAgreement',
        resourceId: id.toString(),
        resourceLabel: existingLoan.creditNumber,
        status: 'success',
        beforeValue: existingLoan,
        afterValue: updatedLoan,
        metadata: {
          previousAgreementId: existingLoan.agreementId,
          newAgreementId: updatedLoan.agreementId,
          agreementCode: agreement.agreementCode,
          agreementName: agreement.businessName,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updatedLoan,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar convenio del credito ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'updateAgreement',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: {
          previousAgreementId: null,
          requestedAgreementId: body.agreementId,
        },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  liquidate: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existingLoan = await db.query.loans.findFirst({
        where: eq(loans.id, id),
      });

      if (!existingLoan) {
        throwHttpError({
          status: 404,
          message: `Credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      if (existingLoan.status !== 'GENERATED') {
        throwHttpError({
          status: 400,
          message: 'Solo se pueden liquidar creditos en estado generado',
          code: 'BAD_REQUEST',
        });
      }

      const loanApplication = await db.query.loanApplications.findFirst({
        where: eq(loanApplications.id, existingLoan.loanApplicationId),
        with: {
          creditProduct: true,
        },
      });

      if (!loanApplication?.creditProduct) {
        throwHttpError({
          status: 404,
          message: 'No se encontro la linea de credito asociada',
          code: 'NOT_FOUND',
        });
      }

      const signatureDocumentRules = await db.query.creditProductDocumentRules.findMany({
        where: eq(
          creditProductDocumentRules.creditProductId,
          loanApplication.creditProduct.id
        ),
        columns: {
          documentTemplateId: true,
        },
      });

      if (signatureDocumentRules.length) {
        const documentTemplateIds = [
          ...new Set(signatureDocumentRules.map((rule) => rule.documentTemplateId)),
        ];

        const signatureDocuments = await db.query.loanDocumentInstances.findMany({
          where: and(
            eq(loanDocumentInstances.loanId, id),
            inArray(loanDocumentInstances.documentTemplateId, documentTemplateIds)
          ),
          columns: {
            documentTemplateId: true,
            revision: true,
            status: true,
          },
        });

        if (!signatureDocuments.length) {
          throwHttpError({
            status: 409,
            message:
              'La linea de credito exige firma digital. Debe enviar documentos y completar firmas antes de liquidar',
            code: 'CONFLICT',
          });
        }

        const latestByTemplate = new Map<
          number,
          { revision: number; status: (typeof loanDocumentInstances.$inferSelect)['status'] }
        >();

        for (const document of signatureDocuments) {
          const current = latestByTemplate.get(document.documentTemplateId);
          if (!current || document.revision > current.revision) {
            latestByTemplate.set(document.documentTemplateId, {
              revision: document.revision,
              status: document.status,
            });
          }
        }

        const pendingTemplateIds = documentTemplateIds.filter((templateId) => {
          const latest = latestByTemplate.get(templateId);
          return !latest || latest.status !== 'SIGNED';
        });

        if (pendingTemplateIds.length) {
          throwHttpError({
            status: 409,
            message:
              'No se puede liquidar. Hay documentos de firma digital pendientes por firmar',
            code: 'CONFLICT',
          });
        }
      }

      const installments = await db.query.loanInstallments.findMany({
        where: eq(loanInstallments.loanId, id),
        orderBy: [asc(loanInstallments.installmentNumber)],
      });

      if (!installments.length) {
        throwHttpError({
          status: 400,
          message: 'El credito no tiene cuotas para liquidar',
          code: 'BAD_REQUEST',
        });
      }

      const distributionLines = await db.query.accountingDistributionLines.findMany({
        where: eq(
          accountingDistributionLines.accountingDistributionId,
          loanApplication.creditProduct.capitalDistributionId
        ),
        with: {
          glAccount: true,
        },
        orderBy: [asc(accountingDistributionLines.id)],
      });

      if (!distributionLines.length) {
        throwHttpError({
          status: 400,
          message: 'La distribucion contable de capital no tiene lineas configuradas',
          code: 'BAD_REQUEST',
        });
      }

      const debitLines = distributionLines.filter((line) => line.nature === 'DEBIT');
      const creditLines = distributionLines.filter((line) => line.nature === 'CREDIT');

      if (!debitLines.length || !creditLines.length) {
        throwHttpError({
          status: 400,
          message: 'La distribucion de capital debe tener lineas debito y credito',
          code: 'BAD_REQUEST',
        });
      }

      const debitPercentage = roundMoney(
        debitLines.reduce((sum, line) => sum + toNumber(line.percentage), 0)
      );
      const creditPercentage = roundMoney(
        creditLines.reduce((sum, line) => sum + toNumber(line.percentage), 0)
      );

      if (Math.abs(debitPercentage - 100) > 0.01 || Math.abs(creditPercentage - 100) > 0.01) {
        throwHttpError({
          status: 400,
          message: 'La distribucion de capital debe sumar 100 en debito y 100 en credito',
          code: 'BAD_REQUEST',
        });
      }

      const loanConceptSnapshots = await db.query.loanBillingConcepts.findMany({
        where: eq(loanBillingConcepts.loanId, existingLoan.id),
        with: {
          glAccount: true,
          billingConcept: true,
        },
      });

      const documentCode = buildLiquidationDocumentCode(existingLoan.id);
      const entryDate = formatDateOnly(body.entryDate);
      const { userId, userName } = getRequiredUserContext(session);

      const { accountingEntriesPayload, portfolioDeltas, disbursementAmount } =
        buildLoanLiquidationArtifacts({
          loan: {
            id: existingLoan.id,
            creditNumber: existingLoan.creditNumber,
            costCenterId: existingLoan.costCenterId,
            thirdPartyId: existingLoan.thirdPartyId,
            creditStartDate: existingLoan.creditStartDate,
            principalAmount: existingLoan.principalAmount,
          },
          installments,
          distributionLines,
          loanConceptSnapshots,
          documentCode,
          entryDate,
          sourceType: 'LOAN_APPROVAL',
          sourceId: String(existingLoan.id),
        });

      const [updatedLoan] = await db.transaction(async (tx) => {
        const alreadyLiquidatedEntry = await tx.query.accountingEntries.findFirst({
          where: and(
            eq(accountingEntries.processType, 'CREDIT'),
            eq(accountingEntries.loanId, existingLoan.id),
            inArray(accountingEntries.status, ['DRAFT', 'ACCOUNTED'])
          ),
          columns: { id: true },
        });

        if (alreadyLiquidatedEntry) {
          throwHttpError({
            status: 409,
            message: 'El credito ya tiene movimientos de liquidacion generados',
            code: 'CONFLICT',
          });
        }

        await tx.insert(accountingEntries).values(accountingEntriesPayload);

        await applyPortfolioDeltas(tx, {
          movementDate: entryDate,
          deltas: portfolioDeltas,
        });

        const [loanUpdated] = await tx
          .update(loans)
          .set({
            disbursementStatus: 'LIQUIDATED',
            disbursementAmount: toDecimalString(disbursementAmount),
            statusChangedByUserId: userId,
            statusChangedByUserName: userName || userId,
          })
          .where(and(eq(loans.id, id), eq(loans.status, 'GENERATED')))
          .returning();

        if (!loanUpdated) {
          throwHttpError({
            status: 409,
            message: 'El estado del credito cambio durante la liquidacion, intente de nuevo',
            code: 'CONFLICT',
          });
        }

        await recordLoanDisbursementEvent(tx, {
          loanId: existingLoan.id,
          eventType: 'LIQUIDATED',
          eventDate: entryDate,
          fromDisbursementStatus: existingLoan.disbursementStatus,
          toDisbursementStatus: 'LIQUIDATED',
          previousFirstCollectionDate: existingLoan.firstCollectionDate,
          newFirstCollectionDate: loanUpdated.firstCollectionDate,
          previousMaturityDate: existingLoan.maturityDate,
          newMaturityDate: loanUpdated.maturityDate,
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Crédito liquidado y movimientos generados',
          metadata: {
            documentCode,
            disbursementAmount: toDecimalString(disbursementAmount),
          },
        });

        return [loanUpdated];
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'liquidate',
        resourceId: id.toString(),
        resourceLabel: existingLoan.creditNumber,
        status: 'success',
        beforeValue: existingLoan,
        afterValue: updatedLoan,
        metadata: {
          accountingDocumentCode: documentCode,
          entriesGenerated: accountingEntriesPayload.length,
          disbursementAmount: toDecimalString(disbursementAmount),
          portfolioRows: portfolioDeltas.length,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updatedLoan,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al liquidar credito ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'liquidate',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        ipAddress,
        userAgent,
      });

      return error;
    }
  },
});
