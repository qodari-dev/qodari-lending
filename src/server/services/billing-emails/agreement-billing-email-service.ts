import { sendResendEmail } from '@/server/clients/resend';
import {
  agreementBillingEmailDispatches,
  billingCycleProfileCycles,
  billingCycleProfiles,
  db,
  loanInstallments,
  loans,
} from '@/server/db';
import { enqueueAgreementBillingEmailJob } from '@/server/queues/agreement-billing-email';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
import { addDays, getDaysInMonth, isSaturday, isSunday, startOfDay, subDays } from 'date-fns';
import { and, asc, desc, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { Workbook } from 'exceljs';

type TriggerSource = 'CRON' | 'MANUAL' | 'RETRY';

type EnqueueAgreementBillingEmailsInput = {
  agreementId?: number | null;
  triggerSource: TriggerSource;
  forceResend?: boolean;
  runDate?: Date;
};

function normalizeToDateOnly(value: Date) {
  return startOfDay(value);
}

function buildPeriod(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function buildAgreementLabel(agreement: {
  agreementCode: string;
  businessName: string;
}) {
  return `${agreement.agreementCode} - ${agreement.businessName}`;
}

function moveToBusinessDay(date: Date, direction: 'PREVIOUS' | 'NEXT') {
  let cursor = new Date(date);
  while (isSaturday(cursor) || isSunday(cursor)) {
    cursor = direction === 'PREVIOUS' ? subDays(cursor, 1) : addDays(cursor, 1);
  }
  return cursor;
}

function resolveCycleRunDateInMonth(params: {
  runDay: number;
  weekendPolicy: 'KEEP' | 'PREVIOUS_BUSINESS_DAY' | 'NEXT_BUSINESS_DAY';
  referenceDate: Date;
}) {
  const year = params.referenceDate.getFullYear();
  const month = params.referenceDate.getMonth();
  const maxDay = getDaysInMonth(new Date(year, month, 1));
  const normalizedRunDay = Math.min(Math.max(params.runDay, 1), maxDay);
  const baseDate = new Date(year, month, normalizedRunDay);

  if (params.weekendPolicy === 'KEEP') return baseDate;
  if (params.weekendPolicy === 'PREVIOUS_BUSINESS_DAY') {
    return moveToBusinessDay(baseDate, 'PREVIOUS');
  }
  return moveToBusinessDay(baseDate, 'NEXT');
}

function renderTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, variableKey: string) => {
    return variables[variableKey] ?? '';
  });
}

function stripHtmlToText(value: string) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getThirdPartyLabel(input: {
  personType?: 'NATURAL' | 'LEGAL' | null;
  businessName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  documentNumber?: string | null;
}) {
  if (input.personType === 'LEGAL') {
    return input.businessName ?? input.documentNumber ?? '-';
  }

  const fullName = [input.firstName, input.secondName, input.firstLastName, input.secondLastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .trim();

  return fullName || input.documentNumber || '-';
}

async function getInstallmentValue(loanId: number, runDate: string) {
  const nextInstallment = await db.query.loanInstallments.findFirst({
    where: and(
      eq(loanInstallments.loanId, loanId),
      inArray(loanInstallments.status, ['GENERATED', 'ACCOUNTED']),
      gte(loanInstallments.dueDate, runDate)
    ),
    columns: {
      principalAmount: true,
      interestAmount: true,
      insuranceAmount: true,
    },
    orderBy: [asc(loanInstallments.dueDate), asc(loanInstallments.installmentNumber)],
  });

  if (nextInstallment) {
    return roundMoney(
      toNumber(nextInstallment.principalAmount) +
        toNumber(nextInstallment.interestAmount) +
        toNumber(nextInstallment.insuranceAmount)
    );
  }

  const latestInstallment = await db.query.loanInstallments.findFirst({
    where: and(
      eq(loanInstallments.loanId, loanId),
      inArray(loanInstallments.status, ['GENERATED', 'ACCOUNTED'])
    ),
    columns: {
      principalAmount: true,
      interestAmount: true,
      insuranceAmount: true,
    },
    orderBy: [desc(loanInstallments.dueDate), desc(loanInstallments.installmentNumber)],
  });

  if (!latestInstallment) return 0;

  return roundMoney(
    toNumber(latestInstallment.principalAmount) +
      toNumber(latestInstallment.interestAmount) +
      toNumber(latestInstallment.insuranceAmount)
  );
}

async function buildLoansAttachment(agreementId: number, runDate: string) {
  const agreementLoans = await db.query.loans.findMany({
    where: and(
      eq(loans.agreementId, agreementId),
      inArray(loans.status, ['ACTIVE', 'ACCOUNTED'])
    ),
    columns: {
      id: true,
      creditNumber: true,
    },
    with: {
      borrower: {
        columns: {
          personType: true,
          businessName: true,
          firstName: true,
          secondName: true,
          firstLastName: true,
          secondLastName: true,
          documentNumber: true,
        },
      },
    },
    orderBy: [asc(loans.creditNumber)],
  });

  const rows = await Promise.all(
    agreementLoans.map(async (loan) => {
      const [balanceSummary, installmentValue] = await Promise.all([
        getLoanBalanceSummary(loan.id),
        getInstallmentValue(loan.id, runDate),
      ]);

      return {
        creditNumber: loan.creditNumber,
        thirdParty: getThirdPartyLabel(loan.borrower),
        balance: roundMoney(toNumber(balanceSummary.currentBalance)),
        installmentValue,
      };
    })
  );

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Creditos');

  worksheet.columns = [
    { header: 'Numero credito', key: 'creditNumber', width: 22 },
    { header: 'Tercero', key: 'thirdParty', width: 38 },
    { header: 'Saldo', key: 'balance', width: 18, style: { numFmt: '#,##0.00' } },
    { header: 'Valor cuota', key: 'installmentValue', width: 18, style: { numFmt: '#,##0.00' } },
  ];

  rows.forEach((row) => worksheet.addRow(row));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const content = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    contentBase64: buffer.toString('base64'),
    rowsCount: rows.length,
  };
}

async function enqueueDispatch(params: {
  agreementId: number;
  billingCycleProfileId: number;
  billingCycleProfileCycleId: number;
  period: string;
  scheduledDate: string;
  triggerSource: TriggerSource;
  forceResend: boolean;
}) {
  const existing = await db.query.agreementBillingEmailDispatches.findFirst({
    where: and(
      eq(agreementBillingEmailDispatches.agreementId, params.agreementId),
      eq(agreementBillingEmailDispatches.billingCycleProfileId, params.billingCycleProfileId),
      eq(
        agreementBillingEmailDispatches.billingCycleProfileCycleId,
        params.billingCycleProfileCycleId
      ),
      eq(agreementBillingEmailDispatches.period, params.period)
    ),
  });

  if (existing) {
    if (existing.status === 'QUEUED' || existing.status === 'RUNNING') {
      return { queued: false as const };
    }

    if (existing.status === 'SENT' && !params.forceResend) {
      return { queued: false as const };
    }

    const [updated] = await db
      .update(agreementBillingEmailDispatches)
      .set({
        status: 'QUEUED',
        triggerSource: params.triggerSource,
        queuedAt: new Date(),
        startedAt: null,
        sentAt: null,
        failedAt: null,
        lastError: null,
        metadata: null,
      })
      .where(eq(agreementBillingEmailDispatches.id, existing.id))
      .returning();

    await enqueueAgreementBillingEmailJob({ dispatchId: updated.id });
    return { queued: true as const };
  }

  const [created] = await db
    .insert(agreementBillingEmailDispatches)
    .values({
      agreementId: params.agreementId,
      billingCycleProfileId: params.billingCycleProfileId,
      billingCycleProfileCycleId: params.billingCycleProfileCycleId,
      period: params.period,
      scheduledDate: params.scheduledDate,
      triggerSource: params.triggerSource,
      status: 'QUEUED',
      queuedAt: new Date(),
    })
    .returning();

  await enqueueAgreementBillingEmailJob({ dispatchId: created.id });
  return { queued: true as const };
}

export async function enqueueAgreementBillingEmails(input: EnqueueAgreementBillingEmailsInput) {
  const runDate = normalizeToDateOnly(input.runDate ?? new Date());
  const runDateOnly = formatDateOnly(runDate);
  const period = buildPeriod(runDate);
  const forceResend = Boolean(input.forceResend);

  const profiles = await db.query.billingCycleProfiles.findMany({
    where: and(
      eq(billingCycleProfiles.isActive, true),
      isNotNull(billingCycleProfiles.agreementId),
      ...(input.agreementId ? [eq(billingCycleProfiles.agreementId, input.agreementId)] : [])
    ),
    with: {
      agreement: {
        with: {
          billingEmailTemplate: true,
        },
      },
      billingCycleProfileCycles: {
        where: eq(billingCycleProfileCycles.isActive, true),
        orderBy: [asc(billingCycleProfileCycles.cycleInMonth)],
      },
    },
  });

  let queuedCount = 0;
  let skippedCount = 0;

  for (const profile of profiles) {
    if (!profile.agreement || !profile.agreement.isActive) {
      skippedCount += 1;
      continue;
    }

    if (!profile.agreement.billingEmailTemplateId || !profile.agreement.billingEmailTo) {
      skippedCount += 1;
      continue;
    }

    const cycles = profile.billingCycleProfileCycles ?? [];
    if (!cycles.length) {
      skippedCount += 1;
      continue;
    }

    const dueCycles = cycles.filter((cycle) => {
      const scheduledRunDate = resolveCycleRunDateInMonth({
        runDay: cycle.runDay,
        weekendPolicy: profile.weekendPolicy,
        referenceDate: runDate,
      });
      return formatDateOnly(scheduledRunDate) === runDateOnly;
    });

    const selectedCycles =
      input.triggerSource === 'CRON'
        ? dueCycles
        : dueCycles.length
          ? [dueCycles[0]]
          : [cycles[0]];

    if (!selectedCycles.length) {
      skippedCount += 1;
      continue;
    }

    for (const cycle of selectedCycles) {
      const enqueueResult = await enqueueDispatch({
        agreementId: profile.agreement.id,
        billingCycleProfileId: profile.id,
        billingCycleProfileCycleId: cycle.id,
        period,
        scheduledDate: runDateOnly,
        triggerSource: input.triggerSource,
        forceResend,
      });

      if (enqueueResult.queued) {
        queuedCount += 1;
      } else {
        skippedCount += 1;
      }
    }
  }

  return {
    queuedCount,
    skippedCount,
    message: `Correos en cola: ${queuedCount}. Omitidos: ${skippedCount}.`,
  };
}

export async function listAgreementBillingEmailDispatches(agreementId: number, limit: number) {
  return db.query.agreementBillingEmailDispatches.findMany({
    where: eq(agreementBillingEmailDispatches.agreementId, agreementId),
    columns: {
      id: true,
      agreementId: true,
      billingCycleProfileId: true,
      billingCycleProfileCycleId: true,
      period: true,
      scheduledDate: true,
      status: true,
      triggerSource: true,
      attempts: true,
      queuedAt: true,
      startedAt: true,
      sentAt: true,
      failedAt: true,
      resendMessageId: true,
      lastError: true,
      createdAt: true,
    },
    orderBy: [desc(agreementBillingEmailDispatches.createdAt), desc(agreementBillingEmailDispatches.id)],
    limit,
  });
}

export async function retryAgreementBillingEmailDispatch(dispatchId: number) {
  const dispatch = await db.query.agreementBillingEmailDispatches.findFirst({
    where: eq(agreementBillingEmailDispatches.id, dispatchId),
  });

  if (!dispatch) {
    throwHttpError({
      status: 404,
      message: `Despacho con ID ${dispatchId} no encontrado`,
      code: 'NOT_FOUND',
    });
  }

  if (dispatch.status === 'QUEUED' || dispatch.status === 'RUNNING') {
    throwHttpError({
      status: 409,
      message: 'El despacho ya se encuentra en cola o en ejecucion',
      code: 'CONFLICT',
    });
  }

  const [updated] = await db
    .update(agreementBillingEmailDispatches)
    .set({
      status: 'QUEUED',
      triggerSource: 'RETRY',
      queuedAt: new Date(),
      startedAt: null,
      sentAt: null,
      failedAt: null,
      lastError: null,
    })
    .where(eq(agreementBillingEmailDispatches.id, dispatchId))
    .returning();

  await enqueueAgreementBillingEmailJob({ dispatchId: updated.id });
  return updated;
}

async function markDispatchFailed(dispatchId: number, errorMessage: string) {
  await db
    .update(agreementBillingEmailDispatches)
    .set({
      status: 'FAILED',
      failedAt: new Date(),
      lastError: errorMessage,
    })
    .where(eq(agreementBillingEmailDispatches.id, dispatchId));
}

export async function processAgreementBillingEmailDispatch(dispatchId: number) {
  const dispatch = await db.query.agreementBillingEmailDispatches.findFirst({
    where: eq(agreementBillingEmailDispatches.id, dispatchId),
    with: {
      agreement: {
        with: {
          billingEmailTemplate: true,
        },
      },
      billingCycleProfile: true,
      billingCycleProfileCycle: true,
    },
  });

  if (!dispatch) {
    throw new Error(`Despacho ${dispatchId} no encontrado`);
  }

  const [runningDispatch] = await db
    .update(agreementBillingEmailDispatches)
    .set({
      status: 'RUNNING',
      startedAt: new Date(),
      attempts: dispatch.attempts + 1,
    })
    .where(eq(agreementBillingEmailDispatches.id, dispatch.id))
    .returning();

  try {
    if (!dispatch.agreement) {
      throw new Error('Despacho sin convenio asociado');
    }
    if (!dispatch.billingCycleProfile || !dispatch.billingCycleProfileCycle) {
      throw new Error('Despacho sin ciclo de facturacion asociado');
    }

    const agreement = dispatch.agreement;
    const template = agreement.billingEmailTemplate;
    if (!template) {
      throw new Error('El convenio no tiene plantilla asignada');
    }
    if (!agreement.billingEmailTo) {
      throw new Error('El convenio no tiene correo principal configurado');
    }

    const variables: Record<string, string> = {
      nit: agreement.documentNumber,
      razon_social: agreement.businessName,
      direccion: agreement.address ?? '',
      telefono: agreement.phone ?? '',
      convenio_codigo: agreement.agreementCode,
      ciclo: String(dispatch.billingCycleProfileCycle.cycleInMonth),
      dia_corte: String(dispatch.billingCycleProfileCycle.cutoffDay),
      dia_envio: String(dispatch.billingCycleProfileCycle.runDay),
      dia_pago_esperado: dispatch.billingCycleProfileCycle.expectedPayDay
        ? String(dispatch.billingCycleProfileCycle.expectedPayDay)
        : '',
      periodo: dispatch.period,
      fecha_envio: formatDateOnly(new Date()),
    };

    const subject = renderTemplate(template.subject, variables);
    const html = renderTemplate(template.htmlContent, variables);
    const text = renderTemplate(stripHtmlToText(template.htmlContent), variables);

    const attachment = await buildLoansAttachment(agreement.id, dispatch.scheduledDate);
    const resendResponse = await sendResendEmail({
      from: template.fromEmail,
      to: [agreement.billingEmailTo],
      cc: agreement.billingEmailCc ? [agreement.billingEmailCc] : undefined,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `cartera-${agreement.agreementCode.toLowerCase()}-${dispatch.period}.xlsx`,
          content: attachment.contentBase64,
        },
      ],
    });

    await db
      .update(agreementBillingEmailDispatches)
      .set({
        status: 'SENT',
        sentAt: new Date(),
        failedAt: null,
        lastError: null,
        resendMessageId: resendResponse.id,
        metadata: {
          agreement: buildAgreementLabel(agreement),
          loansCount: attachment.rowsCount,
        },
      })
      .where(eq(agreementBillingEmailDispatches.id, runningDispatch.id));
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'No fue posible enviar el correo del convenio';
    await markDispatchFailed(runningDispatch.id, message);
    throw error;
  }
}
