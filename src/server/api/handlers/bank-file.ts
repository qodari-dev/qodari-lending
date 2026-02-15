import { db, banks } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { format } from 'date-fns';
import { and, eq } from 'drizzle-orm';
import { contract } from '../contracts';

function toDateOnly(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function buildMockTotals(bankId: number) {
  const reviewedCredits = 18 + (bankId % 9) * 4;
  const totalAmount = reviewedCredits * 1_250_000;

  return {
    reviewedCredits,
    totalAmount,
  };
}

function buildBankFileContent(
  bankCode: string | null,
  liquidationDate: string,
  reviewedCredits: number
) {
  const code = (bankCode ?? 'GEN').toUpperCase();
  const header = `BANCO|${code}|FECHA_LIQUIDACION|${liquidationDate}`;
  const detailHeader = 'CREDITO|DOCUMENTO|VALOR_DESEMBOLSO|CUENTA_BANCARIA';
  const details = Array.from({ length: reviewedCredits }).map((_, index) => {
    const sequence = index + 1;
    const creditNumber = `CR${liquidationDate.replace(/-/g, '').slice(2)}${String(sequence).padStart(5, '0')}`;
    const amount = 1_250_000;
    const accountNumber = `3${String(1000000000 + sequence)}`;
    return `${creditNumber}|10${String(10000000 + sequence)}|${amount}|${accountNumber}`;
  });

  return [header, detailHeader, ...details].join('\n');
}

export const bankFile = tsr.router(contract.bankFile, {
  generate: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

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

      // TODO(bank-file): implementar generacion real de archivo por banco:
      // - consultar creditos liquidados en la fecha indicada
      // - aplicar validaciones de desembolso por banco/cuenta
      // - construir archivo segun la estructura oficial de cada banco
      // - registrar lote generado y trazabilidad de envio
      const liquidationDate = toDateOnly(body.liquidationDate);
      const { reviewedCredits, totalAmount } = buildMockTotals(bank.id);
      const fileName = `${(bank.asobancariaCode || bank.name).toLowerCase().replace(/\s+/g, '-')}-${liquidationDate}.txt`;
      const fileContent = buildBankFileContent(
        bank.asobancariaCode,
        liquidationDate,
        reviewedCredits
      );

      return {
        status: 200 as const,
        body: {
          bankId: bank.id,
          bankName: bank.name,
          bankCode: bank.asobancariaCode ?? null,
          liquidationDate,
          reviewedCredits,
          totalAmount,
          fileName,
          fileContent,
          message: 'Archivo para banco generado.',
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar archivo para banco',
      });
    }
  },
});
