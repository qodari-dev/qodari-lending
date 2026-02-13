import {
  creditProductCategories,
  creditProducts,
  db,
  insuranceCompanies,
  paymentFrequencies,
} from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { calculateCreditSimulation } from '@/server/utils/credit-simulation';
import { calculatePaymentCapacity } from '@/utils/payment-capacity';
import { roundMoney, toNumber } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, lte, gte } from 'drizzle-orm';
import { contract } from '../contracts';

export const creditSimulation = tsr.router(contract.creditSimulation, {
  calculate: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const [product, paymentFrequency] = await Promise.all([
        db.query.creditProducts.findFirst({
          where: and(eq(creditProducts.id, body.creditProductId), eq(creditProducts.isActive, true)),
        }),
        db.query.paymentFrequencies.findFirst({
          where: and(
            eq(paymentFrequencies.id, body.paymentFrequencyId),
            eq(paymentFrequencies.isActive, true)
          ),
        }),
      ]);

      if (!product) {
        throwHttpError({
          status: 404,
          message: 'Linea de credito no encontrada',
          code: 'NOT_FOUND',
        });
      }

      if (!paymentFrequency) {
        throwHttpError({
          status: 404,
          message: 'Periodicidad de pago no encontrada',
          code: 'NOT_FOUND',
        });
      }

      if (product.maxInstallments && body.installments > product.maxInstallments) {
        throwHttpError({
          status: 400,
          message: `El numero de cuotas supera el maximo permitido (${product.maxInstallments})`,
          code: 'BAD_REQUEST',
        });
      }

      const category = await db.query.creditProductCategories.findFirst({
        where: and(
          eq(creditProductCategories.creditProductId, body.creditProductId),
          eq(creditProductCategories.categoryCode, body.categoryCode),
          lte(creditProductCategories.installmentsFrom, body.installments),
          gte(creditProductCategories.installmentsTo, body.installments)
        ),
      });

      if (!category) {
        throwHttpError({
          status: 404,
          message:
            'No existe categoria configurada para la linea y el rango de cuotas seleccionado',
          code: 'NOT_FOUND',
        });
      }

      let insuranceFactor = 0;

      if (product.paysInsurance) {
        if (!body.insuranceCompanyId) {
          throwHttpError({
            status: 400,
            message: 'Debe seleccionar una aseguradora para esta linea de credito',
            code: 'BAD_REQUEST',
          });
        }

        const insurer = await db.query.insuranceCompanies.findFirst({
          where: and(
            eq(insuranceCompanies.id, body.insuranceCompanyId),
            eq(insuranceCompanies.isActive, true)
          ),
          with: {
            insuranceRateRanges: true,
          },
        });

        if (!insurer) {
          throwHttpError({
            status: 404,
            message: 'Aseguradora no encontrada',
            code: 'NOT_FOUND',
          });
        }

        const metricValue =
          product.insuranceRangeMetric === 'INSTALLMENT_COUNT' ? body.installments : body.creditAmount;

        const insuranceRange = insurer.insuranceRateRanges.find(
          (range) =>
            range.rangeMetric === product.insuranceRangeMetric &&
            metricValue >= range.valueFrom &&
            metricValue <= range.valueTo
        );

        if (!insuranceRange) {
          throwHttpError({
            status: 400,
            message: 'La aseguradora no tiene un rango de tasa aplicable para esta simulacion',
            code: 'BAD_REQUEST',
          });
        }

        insuranceFactor = toNumber(insuranceRange.rateValue);
      }

      const financingFactor = toNumber(category.financingFactor);

      const calculation = calculateCreditSimulation({
        financingType: product.financingType,
        principal: body.creditAmount,
        annualRatePercent: financingFactor,
        installments: body.installments,
        firstPaymentDate: body.firstPaymentDate,
        daysInterval: paymentFrequency.daysInterval,
        insuranceRatePercent: insuranceFactor,
      });

      const paymentCapacity = calculatePaymentCapacity({
        income: body.income,
        expenses: body.expenses,
      });
      const maxInstallmentPayment = calculation.summary.maxInstallmentPayment;
      const capacityGap = roundMoney(paymentCapacity - maxInstallmentPayment);
      const isWithinCapacity = maxInstallmentPayment <= paymentCapacity;

      const warningMessage = isWithinCapacity
        ? null
        : `La cuota maxima (${maxInstallmentPayment.toFixed(2)}) supera la capacidad de pago (${paymentCapacity.toFixed(2)}).`;

      return {
        status: 200 as const,
        body: {
          financingType: product.financingType,
          financingFactor,
          insuranceFactor,
          capacity: {
            paymentCapacity,
            maxInstallmentPayment,
            isWithinCapacity,
            capacityGap,
            warningMessage,
          },
          summary: calculation.summary,
          installments: calculation.installments,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al calcular simulacion de credito',
      });
    }
  },
});
