import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { roundMoney } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';

export const loanPaymentFile = tsr.router(contract.loanPaymentFile, {
  process: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const totalPaymentAmount = roundMoney(
        body.records.reduce((acc, row) => acc + row.paymentAmount, 0)
      );

      // TODO(loan-payment-file): implementar el procesamiento real de abonos por archivo:
      // - validar cada fila contra credito + cedula del titular
      // - resolver tipo de recibo/forma de recaudo por regla de negocio
      // - registrar abonos reales en loan_payments (equivalente a create de loan-payment)
      // - ejecutar en transaccion y retornar filas exitosas/fallidas con detalle
      return {
        status: 200 as const,
        body: {
          fileName: body.fileName,
          receivedRecords: body.records.length,
          totalPaymentAmount,
          processedRecords: 0,
          failedRecords: 0,
          message: 'Archivo recibido correctamente.',
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al procesar archivo de abonos',
      });
    }
  },
});
