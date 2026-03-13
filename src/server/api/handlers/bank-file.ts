import { banks, db, loans } from '@/server/db';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { logAudit } from '@/server/utils/audit-logger';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { contract } from '../contracts';

type BankFileLoanRow = {
  id: number;
  creditNumber: string;
  disbursementAmount: string | null;
  bankAccountType: 'SAVINGS' | 'CHECKING' | null;
  bankAccountNumber: string | null;
  disbursementStatus: 'SENT_TO_ACCOUNTING' | 'SENT_TO_BANK' | 'DISBURSED' | 'LIQUIDATED' | 'REJECTED';
  disbursementParty: {
    documentNumber: string;
    firstName: string | null;
    secondName: string | null;
    firstLastName: string | null;
    secondLastName: string | null;
    businessName: string | null;
  } | null;
};

function getThirdPartyName(party: BankFileLoanRow['disbursementParty']): string {
  if (!party) return '';

  const naturalName = [
    party.firstName,
    party.secondName,
    party.firstLastName,
    party.secondLastName,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ');

  return party.businessName?.trim() || naturalName;
}

function buildBankFileContent(args: {
  bankCode: string | null;
  liquidationDate: string;
  rows: Array<{
    creditNumber: string;
    beneficiaryDocument: string;
    beneficiaryName: string;
    amount: number;
    accountType: string;
    accountNumber: string;
  }>;
  totalAmount: number;
}) {
  const code = (args.bankCode ?? 'GEN').toUpperCase();
  const header = [
    'BANCO',
    code,
    'FECHA_LIQUIDACION',
    args.liquidationDate,
    'CREDITOS',
    String(args.rows.length),
    'TOTAL',
    args.totalAmount.toFixed(2),
  ].join('|');
  const detailHeader =
    'CREDITO|DOCUMENTO_BENEFICIARIO|BENEFICIARIO|VALOR_DESEMBOLSO|TIPO_CUENTA|CUENTA';
  const details = args.rows.map((row) =>
    [
      row.creditNumber,
      row.beneficiaryDocument,
      row.beneficiaryName,
      row.amount.toFixed(2),
      row.accountType,
      row.accountNumber,
    ].join('|')
  );

  return [header, detailHeader, ...details].join('\n');
}

export const bankFile = tsr.router(contract.bankFile, {
  generate: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          code: 'UNAUTHENTICATED',
          message: 'Not authenticated',
        });
      }

      const { userId, userName } = getRequiredUserContext(session);

      const bank = await db.query.banks.findFirst({
        where: and(eq(banks.id, body.bankId), eq(banks.isActive, true)),
      });

      if (!bank) {
        throwHttpError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'Banco no encontrado',
        });
      }

      const liquidationDate = formatDateOnly(body.liquidationDate);

      const eligibleLoans = await db.query.loans.findMany({
        where: and(
          eq(loans.bankId, body.bankId),
          eq(loans.status, 'ACCOUNTED'),
          inArray(loans.disbursementStatus, ['SENT_TO_ACCOUNTING', 'REJECTED']),
          eq(loans.creditStartDate, liquidationDate)
        ),
        columns: {
          id: true,
          creditNumber: true,
          disbursementAmount: true,
          bankAccountType: true,
          bankAccountNumber: true,
          disbursementStatus: true,
        },
        with: {
          disbursementParty: {
            columns: {
              documentNumber: true,
              firstName: true,
              secondName: true,
              firstLastName: true,
              secondLastName: true,
              businessName: true,
            },
          },
        },
        orderBy: [asc(loans.creditNumber)],
      });

      if (!eligibleLoans.length) {
        throwHttpError({
          status: 404,
          code: 'NOT_FOUND',
          message:
            'No se encontraron créditos contabilizados pendientes de envío al banco para la fecha indicada',
        });
      }

      const normalizedRows = eligibleLoans.map((loan) => {
        const amount = roundMoney(toNumber(loan.disbursementAmount ?? '0'));
        const beneficiaryDocument = loan.disbursementParty?.documentNumber?.trim() ?? '';
        const beneficiaryName = getThirdPartyName(loan.disbursementParty);
        const accountNumber = loan.bankAccountNumber?.trim() ?? '';

        if (amount <= 0.01) {
          throwHttpError({
            status: 400,
            code: 'BAD_REQUEST',
            message: `El crédito ${loan.creditNumber} no tiene valor neto de desembolso`,
          });
        }

        if (!loan.bankAccountType || !accountNumber) {
          throwHttpError({
            status: 400,
            code: 'BAD_REQUEST',
            message: `El crédito ${loan.creditNumber} no tiene cuenta bancaria completa para envío`,
          });
        }

        if (!beneficiaryDocument) {
          throwHttpError({
            status: 400,
            code: 'BAD_REQUEST',
            message: `El crédito ${loan.creditNumber} no tiene documento del tercero de desembolso`,
          });
        }

        return {
          id: loan.id,
          creditNumber: loan.creditNumber,
          beneficiaryDocument,
          beneficiaryName: beneficiaryName || beneficiaryDocument,
          amount,
          accountType: loan.bankAccountType,
          accountNumber,
          previousDisbursementStatus: loan.disbursementStatus,
        };
      });

      const updatedLoans = await db.transaction(async (tx) => {
        return tx
          .update(loans)
          .set({
            disbursementStatus: 'SENT_TO_BANK',
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(
                loans.id,
                normalizedRows.map((row) => row.id)
              ),
              eq(loans.status, 'ACCOUNTED'),
              inArray(loans.disbursementStatus, ['SENT_TO_ACCOUNTING', 'REJECTED'])
            )
          )
          .returning({
            id: loans.id,
          });
      });

      if (updatedLoans.length !== normalizedRows.length) {
        throwHttpError({
          status: 409,
          code: 'CONFLICT',
          message: 'Uno o más créditos cambiaron de estado durante la generación del archivo',
        });
      }

      const totalAmount = roundMoney(normalizedRows.reduce((sum, row) => sum + row.amount, 0));
      const fileName = `${(bank.asobancariaCode || bank.name)
        .toLowerCase()
        .replace(/\s+/g, '-')}-${liquidationDate}.txt`;
      const fileContent = buildBankFileContent({
        bankCode: bank.asobancariaCode,
        liquidationDate,
        rows: normalizedRows,
        totalAmount,
      });

      const responseBody = {
        bankId: bank.id,
        bankName: bank.name,
        bankCode: bank.asobancariaCode ?? null,
        liquidationDate,
        reviewedCredits: normalizedRows.length,
        totalAmount,
        fileName,
        fileContent,
        message: `Archivo generado. Se marcaron ${normalizedRows.length} créditos como enviados al banco.`,
      };

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'generate',
        status: 'success',
        metadata: {
          bankId: bank.id,
          liquidationDate,
          reviewedCredits: normalizedRows.length,
          totalAmount,
          loanIds: normalizedRows.map((row) => row.id),
          previousStatuses: normalizedRows.map((row) => ({
            loanId: row.id,
            from: row.previousDisbursementStatus,
            to: 'SENT_TO_BANK',
          })),
        },
        ipAddress,
        userAgent,
        userId,
        userName: userName || userId,
      });

      return {
        status: 200 as const,
        body: responseBody,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar archivo para banco',
      });

      if (session) {
        const { userId, userName } = getRequiredUserContext(session);
        await logAudit(session, {
          resourceKey: appRoute.metadata.permissionKey.resourceKey,
          actionKey: appRoute.metadata.permissionKey.actionKey,
          action: 'create',
          functionName: 'generate',
          status: 'failure',
          errorMessage: error.body.message,
          metadata: {
            body,
          },
          ipAddress,
          userAgent,
          userId,
          userName: userName || userId,
        });
      }

      return error;
    }
  },
});
