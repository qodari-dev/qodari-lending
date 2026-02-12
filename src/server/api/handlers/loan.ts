import {
  accountingDistributionLines,
  accountingEntries,
  db,
  loanApplications,
  loanAgreementHistory,
  loanBillingConcepts,
  loanInstallments,
  loanPayments,
  loans,
  loanStatusHistory,
} from '@/server/db';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { logAudit } from '@/server/utils/audit-logger';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import {
  allocateAmountByPercentage,
  buildLiquidationDocumentCode,
  calculateOneTimeConceptAmount,
} from '@/server/utils/accounting-utils';
import { ensureLoanExists, getLoanBalanceSummary, getLoanStatement } from '@/server/utils/loan-statement';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type LoanColumn = keyof typeof loans.$inferSelect;

const LOAN_FIELDS: FieldMap = {
  id: loans.id,
  creditNumber: loans.creditNumber,
  loanApplicationId: loans.loanApplicationId,
  agreementId: loans.agreementId,
  thirdPartyId: loans.thirdPartyId,
  payeeThirdPartyId: loans.payeeThirdPartyId,
  status: loans.status,
  disbursementStatus: loans.disbursementStatus,
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
      },
    },
  },
  agreement: {
    relation: 'agreement',
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
  loanAgreementHistory: {
    relation: 'loanAgreementHistory',
    config: {
      with: {
        agreement: true,
      },
      orderBy: [desc(loanAgreementHistory.changedAt)],
    },
  },
  loanStatusHistory: {
    relation: 'loanStatusHistory',
    config: {
      orderBy: [desc(loanStatusHistory.changedAt)],
    },
  },
});

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

  liquidate: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
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

      const installmentsByVersion = await db.query.loanInstallments.findMany({
        where: eq(loanInstallments.loanId, id),
        orderBy: [desc(loanInstallments.scheduleVersion), asc(loanInstallments.installmentNumber)],
      });

      if (!installmentsByVersion.length) {
        throwHttpError({
          status: 400,
          message: 'El credito no tiene cuotas para liquidar',
          code: 'BAD_REQUEST',
        });
      }

      const currentScheduleVersion = installmentsByVersion[0].scheduleVersion;
      const installments = installmentsByVersion.filter(
        (item) =>
          item.scheduleVersion === currentScheduleVersion &&
          item.status !== 'VOID' &&
          item.status !== 'INACTIVE'
      );

      if (!installments.length) {
        throwHttpError({
          status: 400,
          message: 'No hay cuotas activas para liquidar',
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

      const invalidReceivableCreditLine = distributionLines.find(
        (line) => line.glAccount?.detailType === 'RECEIVABLE' && line.nature === 'CREDIT'
      );
      if (invalidReceivableCreditLine) {
        throwHttpError({
          status: 400,
          message: 'La distribucion de capital no puede acreditar cuentas de cartera',
          code: 'BAD_REQUEST',
        });
      }

      const alreadyLiquidatedEntry = await db.query.accountingEntries.findFirst({
        where: and(
          eq(accountingEntries.loanId, existingLoan.id),
          eq(accountingEntries.sourceType, 'LOAN_APPROVAL'),
          eq(accountingEntries.sourceId, String(existingLoan.id)),
          inArray(accountingEntries.status, ['DRAFT', 'POSTED'])
        ),
        columns: {
          id: true,
        },
      });

      if (alreadyLiquidatedEntry) {
        throwHttpError({
          status: 409,
          message: 'El credito ya tiene movimientos de liquidacion generados',
          code: 'CONFLICT',
        });
      }

      const loanConceptSnapshots = await db.query.loanBillingConcepts.findMany({
        where: eq(loanBillingConcepts.loanId, existingLoan.id),
        with: {
          glAccount: true,
        },
      });
      const oneTimeFinancedConcepts = loanConceptSnapshots.filter(
        (item) => item.frequency === 'ONE_TIME' && item.financingMode === 'FINANCED_IN_LOAN'
      );

      const documentCode = buildLiquidationDocumentCode(existingLoan.id);
      const entryDate = formatDateOnly(new Date());
      const { userId, userName } = getRequiredUserContext(session);
      const principalAmount = toNumber(existingLoan.principalAmount);
      const firstInstallment = installments[0];
      const firstInstallmentAmount = firstInstallment
        ? toNumber(firstInstallment.principalAmount) +
          toNumber(firstInstallment.interestAmount) +
          toNumber(firstInstallment.insuranceAmount)
        : 0;
      let oneTimeConceptAmountTotal = 0;

      let sequence = 1;
      const accountingEntriesPayload: Array<typeof accountingEntries.$inferInsert> = [];
      const portfolioDelta = new Map<
        string,
        {
          glAccountId: number;
          thirdPartyId: number;
          loanId: number;
          installmentNumber: number;
          dueDate: string;
          chargeAmount: number;
          paymentAmount: number;
        }
      >();

      for (const installment of installments) {
        const installmentPrincipal = toNumber(installment.principalAmount);
        if (installmentPrincipal <= 0) continue;

        const debitAmounts = allocateAmountByPercentage({
          totalAmount: installmentPrincipal,
          lines: debitLines,
        });
        const creditAmounts = allocateAmountByPercentage({
          totalAmount: installmentPrincipal,
          lines: creditLines,
        });

        for (const line of debitLines) {
          const amount = debitAmounts.get(line.id) ?? 0;
          if (amount <= 0) continue;

          accountingEntriesPayload.push({
            processType: 'CREDIT',
            documentCode,
            sequence,
            entryDate,
            glAccountId: line.glAccountId,
            costCenterId: line.costCenterId,
            thirdPartyId: existingLoan.thirdPartyId,
            description: `Liquidacion credito ${existingLoan.creditNumber} cuota ${installment.installmentNumber}`.slice(
              0,
              255
            ),
            nature: 'DEBIT',
            amount: toDecimalString(amount),
            loanId: existingLoan.id,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
            status: 'DRAFT',
            statusDate: entryDate,
            sourceType: 'LOAN_APPROVAL',
            sourceId: String(existingLoan.id),
          });
          sequence += 1;

          if (line.glAccount?.detailType === 'RECEIVABLE') {
            const key = `${line.glAccountId}:${existingLoan.thirdPartyId}:${existingLoan.id}:${installment.installmentNumber}`;
            const current = portfolioDelta.get(key) ?? {
              glAccountId: line.glAccountId,
              thirdPartyId: existingLoan.thirdPartyId,
              loanId: existingLoan.id,
              installmentNumber: installment.installmentNumber,
              dueDate: installment.dueDate,
              chargeAmount: 0,
              paymentAmount: 0,
            };
            current.chargeAmount = roundMoney(current.chargeAmount + amount);
            portfolioDelta.set(key, current);
          }
        }

        for (const line of creditLines) {
          const amount = creditAmounts.get(line.id) ?? 0;
          if (amount <= 0) continue;

          accountingEntriesPayload.push({
            processType: 'CREDIT',
            documentCode,
            sequence,
            entryDate,
            glAccountId: line.glAccountId,
            costCenterId: line.costCenterId,
            thirdPartyId: existingLoan.thirdPartyId,
            description: `Liquidacion credito ${existingLoan.creditNumber} cuota ${installment.installmentNumber}`.slice(
              0,
              255
            ),
            nature: 'CREDIT',
            amount: toDecimalString(amount),
            loanId: existingLoan.id,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
            status: 'DRAFT',
            statusDate: entryDate,
            sourceType: 'LOAN_APPROVAL',
            sourceId: String(existingLoan.id),
          });
          sequence += 1;
        }
      }

      for (const concept of oneTimeFinancedConcepts) {
        if (!concept.glAccountId) {
          throwHttpError({
            status: 400,
            message: `Concepto #${concept.billingConceptId} no tiene auxiliar configurado para liquidacion`,
            code: 'BAD_REQUEST',
          });
        }
        if (concept.glAccount?.detailType === 'RECEIVABLE') {
          throwHttpError({
            status: 400,
            message: `Concepto #${concept.billingConceptId} no puede acreditar una cuenta de cartera`,
            code: 'BAD_REQUEST',
          });
        }

        const conceptAmount = calculateOneTimeConceptAmount({
          concept: {
            calcMethod: concept.calcMethod,
            baseAmount: concept.baseAmount,
            rate: concept.rate,
            amount: concept.amount,
            minAmount: concept.minAmount,
            maxAmount: concept.maxAmount,
            roundingMode: concept.roundingMode,
            roundingDecimals: concept.roundingDecimals,
          },
          principal: principalAmount,
          firstInstallmentAmount,
        });

        if (conceptAmount <= 0) continue;
        oneTimeConceptAmountTotal = roundMoney(oneTimeConceptAmountTotal + conceptAmount);

        const debitAmounts = allocateAmountByPercentage({
          totalAmount: conceptAmount,
          lines: debitLines,
        });

        for (const line of debitLines) {
          const amount = debitAmounts.get(line.id) ?? 0;
          if (amount <= 0) continue;

          accountingEntriesPayload.push({
            processType: 'CREDIT',
            documentCode,
            sequence,
            entryDate,
            glAccountId: line.glAccountId,
            costCenterId: line.costCenterId,
            thirdPartyId: existingLoan.thirdPartyId,
            description: `Liquidacion concepto ${concept.billingConceptId} credito ${existingLoan.creditNumber}`.slice(
              0,
              255
            ),
            nature: 'DEBIT',
            amount: toDecimalString(amount),
            loanId: existingLoan.id,
            installmentNumber: firstInstallment?.installmentNumber ?? 1,
            dueDate: firstInstallment?.dueDate ?? existingLoan.creditStartDate,
            status: 'DRAFT',
            statusDate: entryDate,
            sourceType: 'LOAN_APPROVAL',
            sourceId: String(existingLoan.id),
          });
          sequence += 1;

          if (line.glAccount?.detailType === 'RECEIVABLE') {
            const conceptInstallmentNumber = firstInstallment?.installmentNumber ?? 1;
            const conceptDueDate = firstInstallment?.dueDate ?? existingLoan.creditStartDate;
            const key = `${line.glAccountId}:${existingLoan.thirdPartyId}:${existingLoan.id}:${conceptInstallmentNumber}`;
            const current = portfolioDelta.get(key) ?? {
              glAccountId: line.glAccountId,
              thirdPartyId: existingLoan.thirdPartyId,
              loanId: existingLoan.id,
              installmentNumber: conceptInstallmentNumber,
              dueDate: conceptDueDate,
              chargeAmount: 0,
              paymentAmount: 0,
            };
            current.chargeAmount = roundMoney(current.chargeAmount + amount);
            portfolioDelta.set(key, current);
          }
        }

        accountingEntriesPayload.push({
          processType: 'CREDIT',
          documentCode,
          sequence,
          entryDate,
          glAccountId: concept.glAccountId,
          costCenterId: existingLoan.costCenterId ?? null,
          thirdPartyId: existingLoan.thirdPartyId,
          description: `Liquidacion concepto ${concept.billingConceptId} credito ${existingLoan.creditNumber}`.slice(
            0,
            255
          ),
          nature: 'CREDIT',
          amount: toDecimalString(conceptAmount),
          loanId: existingLoan.id,
          installmentNumber: firstInstallment?.installmentNumber ?? 1,
          dueDate: firstInstallment?.dueDate ?? existingLoan.creditStartDate,
          status: 'DRAFT',
          statusDate: entryDate,
          sourceType: 'LOAN_APPROVAL',
          sourceId: String(existingLoan.id),
        });
        sequence += 1;
      }

      if (!accountingEntriesPayload.length) {
        throwHttpError({
          status: 400,
          message: 'No se generaron movimientos para liquidar el credito',
          code: 'BAD_REQUEST',
        });
      }

      const debitTotal = roundMoney(
        accountingEntriesPayload
          .filter((item) => item.nature === 'DEBIT')
          .reduce((sum, item) => sum + toNumber(item.amount), 0)
      );
      const creditTotal = roundMoney(
        accountingEntriesPayload
          .filter((item) => item.nature === 'CREDIT')
          .reduce((sum, item) => sum + toNumber(item.amount), 0)
      );
      if (Math.abs(debitTotal - creditTotal) > 0.01) {
        throwHttpError({
          status: 400,
          message: 'Liquidacion descuadrada: debitos y creditos no coinciden',
          code: 'BAD_REQUEST',
        });
      }

      const [updatedLoan] = await db.transaction(async (tx) => {
        await tx.insert(accountingEntries).values(accountingEntriesPayload);

        await applyPortfolioDeltas(tx, {
          movementDate: entryDate,
          deltas: Array.from(portfolioDelta.values()).map((item) => ({
            glAccountId: item.glAccountId,
            thirdPartyId: item.thirdPartyId,
            loanId: item.loanId,
            installmentNumber: item.installmentNumber,
            dueDate: item.dueDate,
            chargeDelta: item.chargeAmount,
            paymentDelta: item.paymentAmount,
          })),
        });

        await tx
          .update(loanInstallments)
          .set({ status: 'ACCOUNTED' })
          .where(
            and(
              eq(loanInstallments.loanId, id),
              eq(loanInstallments.scheduleVersion, currentScheduleVersion),
              eq(loanInstallments.status, 'GENERATED')
            )
          );

        const [loanUpdated] = await tx
          .update(loans)
          .set({
            status: 'ACTIVE',
            disbursementStatus: 'LIQUIDATED',
            statusDate: entryDate,
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

        await tx.insert(loanStatusHistory).values({
          loanId: id,
          fromStatus: existingLoan.status,
          toStatus: 'ACTIVE',
          changedByUserId: userId,
          changedByUserName: userName || userId,
          note: 'Credito liquidado y saldo inicial generado',
          metadata: {
            accountingDocumentCode: documentCode,
            entriesGenerated: accountingEntriesPayload.length,
            oneTimeConceptsCount: oneTimeFinancedConcepts.length,
            oneTimeConceptsAmount: toDecimalString(oneTimeConceptAmountTotal),
            scheduleVersion: currentScheduleVersion,
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
          oneTimeConceptsCount: oneTimeFinancedConcepts.length,
          oneTimeConceptsAmount: toDecimalString(oneTimeConceptAmountTotal),
          portfolioRows: portfolioDelta.size,
          scheduleVersion: currentScheduleVersion,
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
