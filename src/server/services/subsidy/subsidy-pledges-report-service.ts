import {
  db,
  loanApplicationPledges,
  loanApplications,
  loanPayments,
  loans,
  subsidyPledgePaymentVoucherItems,
  subsidyPledgePaymentVouchers,
  thirdParties,
} from '@/server/db';
import { getSubsidyPaymentsByPeriod } from '@/server/services/subsidy/subsidy-service';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { and, asc, eq, lte } from 'drizzle-orm';

type PerformedReportRow = {
  creditNumber: string;
  borrowerDocumentNumber: string;
  borrowerName: string;
  workerDocumentNumber: string | null;
  beneficiaryCode: string | null;
  subsidyMark: string | null;
  subsidyDocument: string | null;
  discountedAmount: number;
  appliedAmount: number;
  paymentNumber: string | null;
};

type NotPerformedReportRow = {
  creditNumber: string;
  borrowerDocumentNumber: string;
  borrowerName: string;
  workerDocumentNumber: string | null;
  beneficiaryCode: string;
  beneficiaryDocumentNumber: string | null;
  expectedDiscountedAmount: number;
  subsidyDiscountedAmount: number;
  subsidyObservation: string;
  reason: string;
};

type VoucherItemMetadata = {
  subsidyPayment?: {
    beneficiaryCode?: string | null;
  };
  [key: string]: unknown;
};

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.toUpperCase() : null;
}

function toMoney(value: string | number | null | undefined) {
  return roundMoney(toNumber(value ?? 0));
}

function buildExpectedKey(workerDocumentNumber: string | null, beneficiaryCode: string | null) {
  return `${normalizeNullableText(workerDocumentNumber) ?? '-'}::${normalizeNullableText(beneficiaryCode) ?? '-'}`;
}

function parseVoucherItemMetadata(metadata: unknown): VoucherItemMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as VoucherItemMetadata;
}

function buildBorrowerName(input: {
  personType: 'NATURAL' | 'LEGAL' | null;
  businessName: string | null;
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  documentNumber: string | null;
}) {
  return getThirdPartyLabel(input).trim() || input.documentNumber || '-';
}

function parsePeriodBounds(period: string) {
  const digits = period.replace(/\D/g, '');

  if (digits.length < 6) {
    throwHttpError({
      status: 400,
      message: 'El periodo debe tener formato YYYYMM o YYYY-MM',
      code: 'BAD_REQUEST',
    });
  }

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throwHttpError({
      status: 400,
      message: 'El periodo debe tener formato YYYYMM o YYYY-MM',
      code: 'BAD_REQUEST',
    });
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate),
  };
}

function countDistinctCredits<T extends { creditNumber: string }>(rows: T[]) {
  return new Set(rows.map((row) => row.creditNumber)).size;
}

export async function buildPerformedPledgesReport(period: string) {
  const items = await db
    .select({
      sourceFingerprint: subsidyPledgePaymentVoucherItems.sourceFingerprint,
      creditNumber: subsidyPledgePaymentVoucherItems.creditNumber,
      workerDocumentNumber: subsidyPledgePaymentVoucherItems.workerDocumentNumber,
      subsidyMark: subsidyPledgePaymentVoucherItems.subsidyMark,
      subsidyDocument: subsidyPledgePaymentVoucherItems.subsidyDocument,
      discountedAmount: subsidyPledgePaymentVoucherItems.discountedAmount,
      appliedAmount: subsidyPledgePaymentVoucherItems.appliedAmount,
      paymentNumber: loanPayments.paymentNumber,
      borrowerDocumentNumber: thirdParties.documentNumber,
      borrowerPersonType: thirdParties.personType,
      borrowerBusinessName: thirdParties.businessName,
      borrowerFirstName: thirdParties.firstName,
      borrowerSecondName: thirdParties.secondName,
      borrowerFirstLastName: thirdParties.firstLastName,
      borrowerSecondLastName: thirdParties.secondLastName,
      metadata: subsidyPledgePaymentVoucherItems.metadata,
    })
    .from(subsidyPledgePaymentVoucherItems)
    .innerJoin(
      subsidyPledgePaymentVouchers,
      eq(subsidyPledgePaymentVoucherItems.voucherId, subsidyPledgePaymentVouchers.id)
    )
    .leftJoin(loans, eq(subsidyPledgePaymentVoucherItems.loanId, loans.id))
    .leftJoin(thirdParties, eq(loans.thirdPartyId, thirdParties.id))
    .leftJoin(loanPayments, eq(subsidyPledgePaymentVoucherItems.loanPaymentId, loanPayments.id))
    .where(
      and(
        eq(subsidyPledgePaymentVouchers.period, period),
        eq(subsidyPledgePaymentVoucherItems.status, 'PROCESSED')
      )
    )
    .orderBy(
      asc(subsidyPledgePaymentVoucherItems.creditNumber),
      asc(subsidyPledgePaymentVoucherItems.id)
    );

  const rows: PerformedReportRow[] = items
    .filter((item) => !!item.creditNumber)
    .map((item) => {
      const metadata = parseVoucherItemMetadata(item.metadata);
      const beneficiaryCode = normalizeNullableText(metadata?.subsidyPayment?.beneficiaryCode);

      return {
        creditNumber: item.creditNumber!,
        borrowerDocumentNumber: item.borrowerDocumentNumber ?? '-',
        borrowerName: buildBorrowerName({
          personType: item.borrowerPersonType,
          businessName: item.borrowerBusinessName,
          firstName: item.borrowerFirstName,
          secondName: item.borrowerSecondName,
          firstLastName: item.borrowerFirstLastName,
          secondLastName: item.borrowerSecondLastName,
          documentNumber: item.borrowerDocumentNumber,
        }),
        workerDocumentNumber: item.workerDocumentNumber,
        beneficiaryCode,
        subsidyMark: item.subsidyMark,
        subsidyDocument: item.subsidyDocument,
        discountedAmount: toMoney(item.discountedAmount),
        appliedAmount: toMoney(item.appliedAmount),
        paymentNumber: item.paymentNumber ?? null,
      };
    });

  return {
    reportType: 'PERFORMED' as const,
    period,
    reviewedCredits: countDistinctCredits(rows),
    reportedCredits: rows.length,
    rows,
    message: rows.length
      ? 'Reporte de pignoraciones realizadas generado correctamente.'
      : 'No se encontraron abonos de pignoración procesados para el período.',
  };
}

export async function buildNotPerformedPledgesReport(period: string) {
  const { endDate } = parsePeriodBounds(period);

  const [expectedRows, voucherItems, subsidyPaymentsResult] = await Promise.all([
    db
      .select({
        loanId: loans.id,
        creditNumber: loans.creditNumber,
        borrowerDocumentNumber: thirdParties.documentNumber,
        borrowerPersonType: thirdParties.personType,
        borrowerBusinessName: thirdParties.businessName,
        borrowerFirstName: thirdParties.firstName,
        borrowerSecondName: thirdParties.secondName,
        borrowerFirstLastName: thirdParties.firstLastName,
        borrowerSecondLastName: thirdParties.secondLastName,
        beneficiaryCode: loanApplicationPledges.beneficiaryCode,
        beneficiaryDocumentNumber: loanApplicationPledges.documentNumber,
        pledgedAmount: loanApplicationPledges.pledgedAmount,
        effectiveDate: loanApplicationPledges.effectiveDate,
      })
      .from(loanApplicationPledges)
      .innerJoin(
        loanApplications,
        eq(loanApplicationPledges.loanApplicationId, loanApplications.id)
      )
      .innerJoin(loans, eq(loans.loanApplicationId, loanApplications.id))
      .innerJoin(thirdParties, eq(loans.thirdPartyId, thirdParties.id))
      .where(
        and(
          eq(loanApplications.pledgesSubsidy, true),
          eq(loans.status, 'ACCOUNTED'),
          eq(loans.disbursementStatus, 'DISBURSED'),
          lte(loanApplicationPledges.effectiveDate, endDate)
        )
      )
      .orderBy(asc(loans.creditNumber), asc(loanApplicationPledges.id)),
    db
      .select({
        workerDocumentNumber: subsidyPledgePaymentVoucherItems.workerDocumentNumber,
        status: subsidyPledgePaymentVoucherItems.status,
        message: subsidyPledgePaymentVoucherItems.message,
        metadata: subsidyPledgePaymentVoucherItems.metadata,
        id: subsidyPledgePaymentVoucherItems.id,
      })
      .from(subsidyPledgePaymentVoucherItems)
      .innerJoin(
        subsidyPledgePaymentVouchers,
        eq(subsidyPledgePaymentVoucherItems.voucherId, subsidyPledgePaymentVouchers.id)
      )
      .where(eq(subsidyPledgePaymentVouchers.period, period))
      .orderBy(asc(subsidyPledgePaymentVoucherItems.id)),
    getSubsidyPaymentsByPeriod(period),
  ]);

  const subsidyByExpectedKey = new Map<
    string,
    {
      totalDiscountedAmount: number;
      hasPayment: boolean;
      hasDiscount: boolean;
    }
  >();

  for (const payment of subsidyPaymentsResult?.payments ?? []) {
    if (payment.isVoided) {
      continue;
    }

    const key = buildExpectedKey(payment.workerDocumentNumber, payment.beneficiaryCode);
    const current = subsidyByExpectedKey.get(key) ?? {
      totalDiscountedAmount: 0,
      hasPayment: false,
      hasDiscount: false,
    };
    const discountedAmount = toMoney(payment.discountedCreditValue);

    current.hasPayment = true;
    current.totalDiscountedAmount = roundMoney(current.totalDiscountedAmount + discountedAmount);
    current.hasDiscount = current.hasDiscount || discountedAmount > 0;
    subsidyByExpectedKey.set(key, current);
  }

  const voucherItemsByExpectedKey = new Map<
    string,
    Array<{
      id: number;
      status: 'PROCESSED' | 'SKIPPED' | 'ERROR';
      message: string;
    }>
  >();

  for (const item of voucherItems) {
    const metadata = parseVoucherItemMetadata(item.metadata);
    const beneficiaryCode = normalizeNullableText(metadata?.subsidyPayment?.beneficiaryCode);
    const key = buildExpectedKey(item.workerDocumentNumber, beneficiaryCode);
    const list = voucherItemsByExpectedKey.get(key) ?? [];

    list.push({
      id: item.id,
      status: item.status,
      message: item.message ?? '',
    });
    voucherItemsByExpectedKey.set(key, list);
  }

  const rows: NotPerformedReportRow[] = [];

  for (const item of expectedRows) {
    const workerDocumentNumber = item.borrowerDocumentNumber ?? null;
    const key = buildExpectedKey(workerDocumentNumber, item.beneficiaryCode);
    const subsidyEntry = subsidyByExpectedKey.get(key) ?? null;
    const relatedVoucherItems = voucherItemsByExpectedKey.get(key) ?? [];

    if (relatedVoucherItems.some((voucherItem) => voucherItem.status === 'PROCESSED')) {
      continue;
    }

    const latestVoucherItem = relatedVoucherItems[relatedVoucherItems.length - 1] ?? null;
    let subsidyObservation = 'Sin giro en subsidio';
    let reason = 'No hubo giro de subsidio para el beneficiario en el período';

    if (!subsidyPaymentsResult) {
      subsidyObservation = 'No fue posible consultar subsidio';
      reason = 'No fue posible consultar subsidio para validar el período';
    } else if (subsidyEntry?.hasPayment) {
      if (subsidyEntry.hasDiscount) {
        subsidyObservation = 'Giro con descuento a crédito';

        if (!latestVoucherItem) {
          reason = 'Hubo descuento en subsidio, pero no se intentó el abono en el sistema';
        } else if (latestVoucherItem.status === 'ERROR') {
          reason = latestVoucherItem.message || 'Error al aplicar el abono de pignoración';
        } else {
          reason =
            latestVoucherItem.message ||
            'El descuento no terminó en un abono aplicado en el sistema';
        }
      } else {
        subsidyObservation = 'Giro sin descuento a crédito';
        reason = 'Subsidio girado en el período, pero sin descuento aplicado al crédito';
      }
    }

    rows.push({
      creditNumber: item.creditNumber,
      borrowerDocumentNumber: item.borrowerDocumentNumber ?? '-',
      borrowerName: buildBorrowerName({
        personType: item.borrowerPersonType,
        businessName: item.borrowerBusinessName,
        firstName: item.borrowerFirstName,
        secondName: item.borrowerSecondName,
        firstLastName: item.borrowerFirstLastName,
        secondLastName: item.borrowerSecondLastName,
        documentNumber: item.borrowerDocumentNumber,
      }),
      workerDocumentNumber,
      beneficiaryCode: item.beneficiaryCode,
      beneficiaryDocumentNumber: item.beneficiaryDocumentNumber,
      expectedDiscountedAmount: toMoney(item.pledgedAmount),
      subsidyDiscountedAmount: subsidyEntry?.totalDiscountedAmount ?? 0,
      subsidyObservation,
      reason,
    });
  }

  return {
    reportType: 'NOT_PERFORMED' as const,
    period,
    reviewedCredits: countDistinctCredits(
      expectedRows.map((row) => ({ creditNumber: row.creditNumber }))
    ),
    reportedCredits: rows.length,
    rows,
    message: rows.length
      ? 'Reporte de pignoraciones no realizadas generado correctamente.'
      : 'No se encontraron pignoraciones pendientes por aplicar para el período.',
  };
}
