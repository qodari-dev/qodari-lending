import { env } from '@/env';
import { creditsSettings, db, loanApplicationActNumbers, loanApplications } from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { formatDateOnly, toNumber } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { eq } from 'drizzle-orm';
import type { MinutesReportData, MinutesReportGroup, MinutesReportSigner } from '@/server/pdf/templates/minutes-report';

function getSigners(
  settings: typeof creditsSettings.$inferSelect
): MinutesReportSigner[] {
  return [
    settings.creditManagerName && settings.creditManagerTitle
      ? {
          name: settings.creditManagerName,
          title: settings.creditManagerTitle,
        }
      : null,
    settings.financeManagerName && settings.financeManagerTitle
      ? {
          name: settings.financeManagerName,
          title: settings.financeManagerTitle,
        }
      : null,
    settings.adminDirectorName && settings.adminDirectorTitle
      ? {
          name: settings.adminDirectorName,
          title: settings.adminDirectorTitle,
        }
      : null,
  ].filter((item): item is MinutesReportSigner => Boolean(item));
}

export async function buildMinutesReportData(minutesNumber: string): Promise<MinutesReportData> {
  const normalizedMinutesNumber = minutesNumber.trim().toUpperCase();

  const actRows = await db.query.loanApplicationActNumbers.findMany({
    where: eq(loanApplicationActNumbers.actNumber, normalizedMinutesNumber),
    with: {
      affiliationOffice: {
        with: {
          city: true,
        },
      },
    },
  });

  const applications = await db.query.loanApplications.findMany({
    where: eq(loanApplications.actNumber, normalizedMinutesNumber),
    with: {
      thirdParty: true,
      creditProduct: true,
      affiliationOffice: {
        with: {
          city: true,
        },
      },
    },
    orderBy: (table, { asc, desc }) => [asc(table.creditProductId), desc(table.creditNumber)],
  });

  if (!applications.length) {
    throwHttpError({
      status: 404,
      code: 'NOT_FOUND',
      message: `No existe informacion para el acta ${normalizedMinutesNumber}`,
    });
  }

  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
  });

  if (!settings) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'No existe configuracion de creditos para generar el acta',
    });
  }

  const office = actRows[0]?.affiliationOffice ?? applications[0]?.affiliationOffice ?? null;
  const actDate =
    actRows[0]?.actDate ??
    applications[0]?.statusDate ??
    applications[0]?.applicationDate;

  const groupsMap = new Map<number, MinutesReportGroup>();

  for (const application of applications) {
    const productId = application.creditProductId;
    const existing = groupsMap.get(productId) ?? {
      creditLineName: application.creditProduct?.name ?? 'CREDITO',
      approvedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      approvedLoans: [],
    };

    const amount = toNumber(application.approvedAmount ?? application.requestedAmount);

    if (application.status === 'APPROVED') {
      existing.approvedAmount += amount;
      existing.approvedLoans.push({
        itemNumber: existing.approvedLoans.length + 1,
        thirdPartyName: getThirdPartyLabel(application.thirdParty),
        thirdPartyDocumentNumber: application.thirdParty?.documentNumber ?? null,
        approvedAmount: amount,
        creditNumber: application.creditNumber,
      });
    } else if (application.status === 'PENDING') {
      existing.pendingAmount += amount;
    } else {
      existing.rejectedAmount += amount;
    }

    groupsMap.set(productId, existing);
  }

  return {
    companyName: settings.companyName?.trim() || env.IAM_APP_SLUG,
    city: office?.city?.name ?? 'Ciudad',
    actNumber: normalizedMinutesNumber,
    actDate: formatDateOnly(new Date(actDate)),
    generatedAt: new Date().toISOString(),
    locationName: office?.city?.name ?? office?.name ?? 'Ciudad',
    signers: getSigners(settings),
    reviewedApplicationsCount: applications.length,
    groups: Array.from(groupsMap.values()),
  };
}
