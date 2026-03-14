import { env } from '@/env';
import { creditsSettings, db, loans } from '@/server/db';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { toNumber } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { eq } from 'drizzle-orm';
import type { CollectionLetterData } from '@/server/pdf/templates/collection-letter';

type CollectionLetterKind = 'administrative' | 'pre-legal';

function buildRecipientLines(input: {
  name: string;
  documentNumber: string | null;
  address: string | null;
  phone: string | null;
  city: string | null;
}) {
  return [
    'Senor(a)',
    input.name,
    input.documentNumber ? `C.C. ${input.documentNumber}` : null,
    input.address,
    input.phone,
    input.city,
  ].filter((value): value is string => Boolean(value && value.trim()));
}

function resolveSender(settings: typeof creditsSettings.$inferSelect, kind: CollectionLetterKind) {
  if (kind === 'pre-legal') {
    return {
      name: settings.legalAdvisorName?.trim() || settings.creditManagerName?.trim() || 'Area Juridica',
      role:
        settings.legalAdvisorTitle?.trim() ||
        settings.creditManagerTitle?.trim() ||
        'Cobro Prejuridico',
    };
  }

  return {
    name:
      settings.adminDirectorName?.trim() ||
      settings.adminManagerName?.trim() ||
      settings.creditManagerName?.trim() ||
      'Area Administrativa',
    role:
      settings.adminDirectorTitle?.trim() ||
      settings.adminManagerTitle?.trim() ||
      settings.creditManagerTitle?.trim() ||
      'Cobro Administrativo',
  };
}

function buildAdministrativeParagraphs() {
  return {
    greeting: 'Cordial saludo:',
    introParagraphs: [
      'De manera atenta, le recordamos que a la fecha usted presenta un saldo en cartera con nuestra corporacion.',
      'Por tal razon, con el animo de continuar prestandole nuestros servicios, de manera respetuosa nos permitimos solicitarle se acerque a nuestras oficinas a realizar la cancelacion total de su obligacion.',
      'Si al recibir el presente comunicado usted ya ha efectuado el pago, favor hacernos llegar fotocopia del soporte de cancelacion y hacer caso omiso a esta solicitud, aceptando nuestras disculpas.',
    ],
    closingParagraphs: [],
    futureActionItems: [] as string[],
  };
}

function buildPreLegalParagraphs() {
  return {
    greeting: null,
    introParagraphs: [
      'En mi condicion de apoderado judicial de la Caja de Compensacion Familiar, me dirijo a usted para recordarle una vez mas su obligacion por concepto de credito social, toda vez que no se ha cumplido oportunamente con los pagos pactados.',
      'Recuerde que para respaldar su obligacion usted suscribio un pagare que hace las veces de letra de cambio, el cual puede ser ejecutado ante las instancias judiciales respectivas, por lo que en comedida manera lo invito a que se acerque dentro de los cinco (5) dias siguientes al recibo de esta comunicacion para que se ponga al dia en su obligacion.',
      'En atencion a la mora presentada y al caso omiso a las anteriores comunicaciones, se le informa que de no atender la presente citacion se iniciaran las acciones juridicas legales a que haya lugar para exigir el pago de la obligacion.',
    ],
    closingParagraphs: [
      'La Caja de Compensacion Familiar se encuentra a disposicion de los ciudadanos, por eso se le invita a presentar sus propuestas de pago de las obligaciones morosas en el area juridica o de cartera.',
    ],
    futureActionItems: ['Reporte de centrales de riesgo', 'Demanda judicial'],
  };
}

export async function buildCollectionLetterData(
  creditNumber: string,
  kind: CollectionLetterKind
): Promise<CollectionLetterData> {
  const normalizedCreditNumber = creditNumber.trim().toUpperCase();

  const loan = await db.query.loans.findFirst({
    where: eq(loans.creditNumber, normalizedCreditNumber),
    with: {
      borrower: {
        with: {
          homeCity: true,
          workCity: true,
        },
      },
      repaymentMethod: true,
      affiliationOffice: {
        with: {
          city: true,
        },
      },
    },
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      code: 'NOT_FOUND',
      message: `No existe un credito con numero ${normalizedCreditNumber}`,
    });
  }

  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
  });

  if (!settings) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'No existe configuracion de creditos para generar la carta',
    });
  }

  const borrowerName = getThirdPartyLabel(loan.borrower);
  const borrowerCity = loan.borrower?.homeCity?.name ?? loan.borrower?.workCity?.name ?? null;
  const borrowerAddress = loan.borrower?.homeAddress ?? loan.borrower?.workAddress ?? null;
  const borrowerPhone =
    loan.borrower?.mobilePhone ?? loan.borrower?.homePhone ?? loan.borrower?.workPhone ?? null;
  const companyPhone = settings.companyPhone?.trim() || loan.affiliationOffice?.phone || '';
  const companyAddress = settings.companyAddress?.trim() || loan.affiliationOffice?.address || '';
  const companyName = settings.companyName?.trim() || env.IAM_APP_SLUG;
  const city = loan.affiliationOffice?.city?.name || 'Ciudad';

  const summary = await getLoanBalanceSummary(loan.id);
  const overdueAmount = toNumber(summary.overdueBalance);
  const sender = resolveSender(settings, kind);
  const paragraphs =
    kind === 'pre-legal' ? buildPreLegalParagraphs() : buildAdministrativeParagraphs();

  return {
    referenceCode: kind === 'pre-legal' ? `OJ-PREJURIDICO-${normalizedCreditNumber}` : null,
    title:
      kind === 'pre-legal' ? 'Carta de cobro prejuridico' : 'Carta de cobro administrativo',
    subject: kind === 'pre-legal' ? 'COBRO PREJURIDICO' : 'COBRO ADMINISTRATIVO',
    creditNumber: normalizedCreditNumber,
    recipientName: borrowerName,
    recipientLines: buildRecipientLines({
      name: borrowerName,
      documentNumber: loan.borrower?.documentNumber ?? null,
      address: borrowerAddress,
      phone: borrowerPhone,
      city: borrowerCity,
    }),
    city,
    generatedAt: new Date().toISOString(),
    greeting: paragraphs.greeting,
    introParagraphs: paragraphs.introParagraphs,
    loanLineName: loan.repaymentMethod?.name ?? 'CREDITO',
    overdueAmount,
    futureActionItems: paragraphs.futureActionItems,
    closingParagraphs: paragraphs.closingParagraphs,
    contactParagraph:
      companyPhone || companyAddress
        ? `Mayor informacion, telefono: ${companyPhone || 'N/D'}, oficina juridica o de cartera de ${companyName}, ${companyAddress || 'direccion no configurada'}.`
        : null,
    senderName: sender.name,
    senderRole: sender.role,
    companyName,
  };
}
