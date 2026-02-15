import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { roundMoney } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';

export const loanPaymentPayroll = tsr.router(contract.loanPaymentPayroll, {
  process: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const totalPaymentAmount = roundMoney(
        body.rows.reduce((acc, row) => acc + row.paymentAmount, 0)
      );
      const totalOverpaidAmount = roundMoney(
        body.rows.reduce((acc, row) => acc + row.overpaidAmount, 0)
      );

      // TODO(loan-payment-payroll): implementar procesamiento real de abono por libranza:
      // - validar encabezado (convenio/documento empresa, tipo recibo, fecha recaudo, referencia)
      // - si no hay convenio, resolver tercero/empresa por documento y usarlo como criterio de busqueda
      // - validar filas contra creditos activos segun convenio o empresa y reglas de recaudo
      // - registrar abonos reales en loan_payments y afectar cartera/contabilidad
      // - manejar transaccion y devolver detalle de filas aplicadas/rechazadas
      return {
        status: 200 as const,
        body: {
          agreementId: body.agreementId ?? null,
          companyDocumentNumber: body.companyDocumentNumber?.trim() || null,
          receiptTypeId: body.receiptTypeId,
          collectionAmount: body.collectionAmount,
          receivedRows: body.rows.length,
          processedRows: 0,
          totalPaymentAmount,
          totalOverpaidAmount,
          message: 'Lote de libranza recibido. Procesamiento pendiente de implementacion.',
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al procesar abono por libranza',
      });
    }
  },
});
