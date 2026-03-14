import { accountingEntries, db, glAccounts, loanInstallments, loanPayments, loans, thirdParties } from '@/server/db';
import { roundMoney, toNumber } from '@/server/utils/value-utils';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { differenceInCalendarDays, parseISO } from 'date-fns';

type GenerateCifinReportArgs = {
  creditCutoffDate: Date;
  paymentCutoffDate: Date;
};

export type RiskCenterLoanItem = {
  loanId: number;
  wasReported: boolean;
  reportedStatus: string;
  daysPastDue: number;
  currentBalance: number;
  overdueBalance: number;
  reportedThirdPartiesCount: number;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

type CifinRowSource = {
  documentNumber: string;
  businessName: string | null;
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  homeAddress: string | null;
  workAddress: string | null;
  homePhone: string | null;
  workPhone: string | null;
  mobilePhone: string | null;
  email: string | null;
  employerDocumentNumber: string | null;
  employerBusinessName: string | null;
  identificationType?: { code: string | null; name: string | null } | null;
  homeCity?: { code: string; name: string } | null;
  workCity?: { code: string; name: string } | null;
};

type CifinLoanMetrics = {
  currentBalance: number;
  overdueBalance: number;
  oldestOverdueDays: number | null;
  overdueInstallments: number;
  openInstallments: number;
  earliestOverdueDueDate: string | null;
};

type CifinField = {
  key: string;
  header: string;
};

const CIFIN_FIELDS: CifinField[] = [
  { key: 'tipide', header: 'Tipo ident' },
  { key: 'numide', header: 'No identificacion' },
  { key: 'nombre', header: 'Nombre del Tercero' },
  { key: 'reservado', header: 'Reservado' },
  { key: 'feclimpag', header: 'Fecha limite de pago' },
  { key: 'numobl', header: 'Numero de Obligacion' },
  { key: 'codsuc', header: 'Codigo Sucursal' },
  { key: 'calidad', header: 'Calidad' },
  { key: 'califi', header: 'Calificacion' },
  { key: 'esttit', header: 'Estado del Titular' },
  { key: 'estobl', header: 'Estado de la Obligacion' },
  { key: 'edamor', header: 'Edad Mora' },
  { key: 'anomor', header: 'Anios Mora' },
  { key: 'feccor', header: 'Fecha de Corte' },
  { key: 'fecini', header: 'Fecha inicio' },
  { key: 'fecter', header: 'Fecha terminacion' },
  { key: 'fecexi', header: 'Fecha de Exigibilidad' },
  { key: 'fecpre', header: 'Fecha de Prescripcion' },
  { key: 'fecpag', header: 'Fecha de Pago' },
  { key: 'modext', header: 'Modalidad de Extincion' },
  { key: 'tippag', header: 'Tipo de pago' },
  { key: 'periodicidad', header: 'Periodicidad' },
  { key: 'pronopag', header: 'Probabilidad de no Pago' },
  { key: 'numcuopag', header: 'Numero de Cuotas Pagadas' },
  { key: 'numcuopac', header: 'Numero de Cuotas Pactadas' },
  { key: 'numcuomor', header: 'Numero de Cuotas en Mora' },
  { key: 'valini', header: 'Valor Inicial del Credito' },
  { key: 'valmor', header: 'Valor de Mora' },
  { key: 'valsal', header: 'Valor del Saldo' },
  { key: 'valcuo', header: 'Valor de la Cuota' },
  { key: 'valcarfij', header: 'Valor Cargo Fijo' },
  { key: 'lincre', header: 'Linea de Credito' },
  { key: 'claper', header: 'Clausula de Permanencia' },
  { key: 'tipcon', header: 'Tipo de Contrato' },
  { key: 'estcon', header: 'Estado de Contrato' },
  { key: 'vigcon', header: 'Vigencia del Contrato' },
  { key: 'nummescon', header: 'Numero de Meses del Contrato' },
  { key: 'natjur', header: 'Naturaleza Juridica' },
  { key: 'modcre', header: 'Modalidad de Credito' },
  { key: 'tipmon', header: 'Tipo de Moneda' },
  { key: 'tipgar', header: 'Tipo de Garantia' },
  { key: 'valgar', header: 'Valor de Garantia' },
  { key: 'oblres', header: 'Obligacion Reestructurada' },
  { key: 'natres', header: 'Naturaleza de la Reestructuracion' },
  { key: 'numres', header: 'Numero de la Reestructuracion' },
  { key: 'clatar', header: 'Clase de Tarjeta' },
  { key: 'numchedev', header: 'Numero de Cheques Devueltos' },
  { key: 'catser', header: 'Categoria de Servicios' },
  { key: 'plazo', header: 'Plazo' },
  { key: 'diacar', header: 'Dias de Cartera' },
  { key: 'tipcue', header: 'Tipo de Cuenta' },
  { key: 'cupsob', header: 'Cupo de Sobregiro' },
  { key: 'diaaut', header: 'Dias Autorizados' },
  { key: 'dirter', header: 'Direccion del Tercero' },
  { key: 'telter', header: 'Telefono del Tercero' },
  { key: 'codciuter', header: 'Codigo Ciudad del Tercero' },
  { key: 'ciudadter', header: 'Ciudad del Tercero' },
  { key: 'coddepter', header: 'Codigo Departamento del Tercero' },
  { key: 'departamentoter', header: 'Departamento del Tercero' },
  { key: 'nomemp', header: 'Nombre de Empresa' },
  { key: 'diremp', header: 'Direccion de Empresa' },
  { key: 'telemp', header: 'Telefono de Empresa' },
  { key: 'codciuemp', header: 'Codigo de Ciudad Empresa' },
  { key: 'ciudademp', header: 'Ciudad de Empresa' },
  { key: 'coddepemp', header: 'Codigo de Departamento de Empresa' },
  { key: 'departamentoemp', header: 'Departamento de Empresa' },
  { key: 'feciniexcgmf', header: 'Fecha Inicio Excension Gmf' },
  { key: 'fecterexcgmf', header: 'Fecha Termi Excension Gmf' },
  { key: 'numrencdt', header: 'Numero de Renovacion Cdt' },
  { key: 'ctaahoexegmf', header: 'Cta Ahorro Exenta Gmf' },
  { key: 'tipideori', header: 'Tipo de Identificacion originaria' },
  { key: 'numideori', header: 'No de identificacion originaria' },
  { key: 'tipentori', header: 'Tipo de entidad originaria' },
  { key: 'codentori', header: 'Codigo de entidad originaria' },
  { key: 'tipfid', header: 'Tipo de fideicomiso' },
  { key: 'numfid', header: 'Numero del fideicomiso' },
  { key: 'nomfid', header: 'Nombre fideicomiso' },
  { key: 'tipdeucar', header: 'Tipo De Deuda Cartera' },
  { key: 'tippol', header: 'Tipo De Poliza' },
  { key: 'codram', header: 'Codigo de Ramo' },
  { key: 'numreatar', header: 'Numero Real Tarjeta' },
  { key: 'coremp', header: 'Correo electronico Empresa' },
  { key: 'celemp', header: 'No Celular Empresa' },
];

function formatDbDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatCifinDate(value: string | null | undefined) {
  if (!value) return '';
  return value.replaceAll('-', '');
}

function sanitizeCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
}

function padNumber(value: number, length: number) {
  const normalized = Math.max(0, Math.round(value));
  return String(normalized).padStart(length, '0');
}

function amountToLegacy(value: number) {
  return padNumber(Math.round(value / 1000), 12);
}

function getThirdPartyName(thirdParty: CifinRowSource) {
  if (thirdParty.businessName) return thirdParty.businessName;

  return [
    thirdParty.firstLastName,
    thirdParty.secondLastName,
    thirdParty.firstName,
    thirdParty.secondName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getIdentificationCode(source: CifinRowSource) {
  const code = (source.identificationType?.code ?? source.identificationType?.name ?? '').toUpperCase();
  if (code.includes('NIT')) return '02';
  if (code.includes('CE') || code.includes('EXTRANJ')) return '03';
  if (code.includes('TI')) return '04';
  if (code.includes('PA')) return '05';
  return '01';
}

function getPreferredCity(source: CifinRowSource) {
  return source.homeCity ?? source.workCity ?? null;
}

function getPreferredAddress(source: CifinRowSource) {
  return source.homeAddress ?? source.workAddress ?? '';
}

function getPreferredPhone(source: CifinRowSource) {
  return source.mobilePhone ?? source.homePhone ?? source.workPhone ?? '';
}

function getCityCodeParts(code: string | null | undefined) {
  if (!code) {
    return { departmentCode: '', cityCode: '' };
  }

  const normalized = code.padStart(5, '0').slice(-5);
  return {
    departmentCode: normalized.slice(0, 2),
    cityCode: normalized.slice(2),
  };
}

function getAgingBucket(daysPastDue: number | null) {
  if (daysPastDue === null || daysPastDue < 30) return '00';
  if (daysPastDue < 60) return '01';
  if (daysPastDue < 90) return '02';
  if (daysPastDue < 120) return '03';
  if (daysPastDue < 150) return '04';
  if (daysPastDue < 180) return '05';
  if (daysPastDue < 210) return '06';
  if (daysPastDue < 240) return '07';
  if (daysPastDue < 270) return '08';
  if (daysPastDue < 300) return '09';
  if (daysPastDue < 330) return '10';
  if (daysPastDue < 360) return '11';
  if (daysPastDue < 540) return '12';
  if (daysPastDue < 730) return '13';
  return '14';
}

function getLineCode(repaymentMethodName: string | null | undefined) {
  if ((repaymentMethodName ?? '').toUpperCase().includes('PIGNOR')) return '015';
  return '032';
}

function getPlazoCode(installments: number) {
  if (installments <= 12) return '7';
  if (installments <= 24) return '8';
  if (installments <= 36) return '9';
  if (installments <= 48) return '10';
  return '11';
}

function buildEmptyFieldRecord() {
  return Object.fromEntries(CIFIN_FIELDS.map((field) => [field.key, ''])) as Record<string, string>;
}

function renderRows(rows: Array<Record<string, string>>) {
  const header = CIFIN_FIELDS.map((field) => field.header).join('\t');
  const body = rows.map((row) => CIFIN_FIELDS.map((field) => sanitizeCell(row[field.key])).join('\t'));
  return [header, ...body].join('\n');
}

function shouldIncludePaidLoan(loan: {
  status: (typeof loans.$inferSelect)['status'];
  isReportedToRiskCenter: boolean;
  riskCenterReportDate: string | null;
  lastPaymentDate: string | null;
}) {
  if (loan.status !== 'PAID') return true;
  if (!loan.isReportedToRiskCenter) return true;
  if (!loan.riskCenterReportDate) return true;
  if (!loan.lastPaymentDate) return false;
  return loan.riskCenterReportDate < loan.lastPaymentDate;
}

function buildMetricsMap(
  entryRows: Array<{
    loanId: number | null;
    installmentNumber: number | null;
    dueDate: string | null;
    nature: 'DEBIT' | 'CREDIT';
    amount: string;
  }>,
  paymentCutoffDate: string
) {
  const grouped = new Map<number, Map<number, { dueDate: string | null; balance: number }>>();

  for (const row of entryRows) {
    if (!row.loanId || row.installmentNumber === null) continue;
    const loanMap = grouped.get(row.loanId) ?? new Map<number, { dueDate: string | null; balance: number }>();
    const current = loanMap.get(row.installmentNumber) ?? { dueDate: row.dueDate, balance: 0 };
    const delta = row.nature === 'DEBIT' ? toNumber(row.amount) : -toNumber(row.amount);
    current.balance = roundMoney(current.balance + delta);
    current.dueDate = row.dueDate ?? current.dueDate;
    loanMap.set(row.installmentNumber, current);
    grouped.set(row.loanId, loanMap);
  }

  const result = new Map<number, CifinLoanMetrics>();

  for (const [loanId, installmentMap] of grouped.entries()) {
    const installments = Array.from(installmentMap.values());
    const currentBalance = installments.reduce((acc, item) => roundMoney(acc + item.balance), 0);
    const overdue = installments.filter(
      (item) => item.balance > 0.01 && !!item.dueDate && item.dueDate < paymentCutoffDate
    );
    const earliestOverdueDueDate = overdue
      .map((item) => item.dueDate as string)
      .sort((a, b) => a.localeCompare(b))[0] ?? null;

    result.set(loanId, {
      currentBalance: roundMoney(currentBalance),
      overdueBalance: roundMoney(overdue.reduce((acc, item) => acc + item.balance, 0)),
      overdueInstallments: overdue.length,
      openInstallments: installments.filter((item) => item.balance > 0.01).length,
      earliestOverdueDueDate,
      oldestOverdueDays: earliestOverdueDueDate
        ? differenceInCalendarDays(parseISO(paymentCutoffDate), parseISO(earliestOverdueDueDate))
        : null,
    });
  }

  return result;
}

function buildCifinRow(args: {
  person: CifinRowSource;
  quality: 'P' | 'C';
  employer: (typeof thirdParties.$inferSelect & {
    homeCity?: { code: string; name: string } | null;
    workCity?: { code: string; name: string } | null;
  }) | null;
  loan: {
    creditNumber: string;
    creditStartDate: string;
    maturityDate: string;
    installments: number;
    principalAmount: string;
  };
  loanMetrics: CifinLoanMetrics;
  firstInstallmentAmount: number;
  paymentCutoffDate: string;
  latestPaymentDate: string | null;
  repaymentMethodName: string | null | undefined;
}) {
  const row = buildEmptyFieldRecord();
  const city = getPreferredCity(args.person);
  const cityCodes = getCityCodeParts(city?.code);
  const employerCity = args.employer?.homeCity ?? args.employer?.workCity ?? null;
  const employerCityCodes = getCityCodeParts(employerCity?.code);

  const holderPaid = args.loanMetrics.currentBalance <= 0.01;
  const agingBucket = holderPaid ? '00' : getAgingBucket(args.loanMetrics.oldestOverdueDays);
  const yearsInArrears =
    agingBucket === '14' && args.loanMetrics.oldestOverdueDays !== null
      ? String(Math.round(args.loanMetrics.oldestOverdueDays / 365))
      : '';
  const paidInstallments = Math.max(0, args.loan.installments - args.loanMetrics.openInstallments);
  const moraValue = roundMoney(args.firstInstallmentAmount * args.loanMetrics.overdueInstallments);

  row.tipide = getIdentificationCode(args.person);
  row.numide = args.person.documentNumber ?? '';
  row.nombre = getThirdPartyName(args.person);
  row.reservado = '';
  row.feclimpag = formatCifinDate(args.paymentCutoffDate);
  row.numobl = args.loan.creditNumber;
  row.codsuc = '000001';
  row.calidad = args.quality;
  row.califi = holderPaid ? '01' : '';
  row.esttit = holderPaid ? '03' : '';
  row.estobl = holderPaid ? '07' : '01';
  row.edamor = agingBucket;
  row.anomor = yearsInArrears;
  row.feccor = formatCifinDate(args.paymentCutoffDate);
  row.fecini = formatCifinDate(args.loan.creditStartDate);
  row.fecter = formatCifinDate(args.loan.maturityDate);
  row.fecexi =
    args.loanMetrics.overdueInstallments > 0 ? formatCifinDate(args.loanMetrics.earliestOverdueDueDate) : '';
  row.fecpre = '';
  row.fecpag = holderPaid ? formatCifinDate(args.latestPaymentDate) : '';
  row.modext = holderPaid ? '01' : '';
  row.tippag = holderPaid ? '01' : '';
  row.periodicidad = '07';
  row.pronopag = '';
  row.numcuopag = padNumber(paidInstallments, 3);
  row.numcuopac = padNumber(args.loan.installments, 3);
  row.numcuomor = padNumber(args.loanMetrics.overdueInstallments, 3);
  row.valini = amountToLegacy(toNumber(args.loan.principalAmount));
  row.valmor = amountToLegacy(moraValue);
  row.valsal = amountToLegacy(args.loanMetrics.currentBalance);
  row.valcuo = amountToLegacy(args.firstInstallmentAmount);
  row.valcarfij = '';
  row.lincre = getLineCode(args.repaymentMethodName);
  row.claper = '';
  row.tipcon = '001';
  row.estcon = args.loanMetrics.currentBalance > 0.01 ? '001' : '002';
  row.vigcon = '01';
  row.nummescon = padNumber(args.loan.installments, 3);
  row.natjur = '';
  row.modcre = '';
  row.tipmon = '';
  row.tipgar = '';
  row.valgar = '';
  row.oblres = '02';
  row.natres = '';
  row.numres = '';
  row.clatar = '';
  row.numchedev = '';
  row.catser = '';
  row.plazo = getPlazoCode(args.loan.installments);
  row.diacar = '';
  row.tipcue = '';
  row.cupsob = '';
  row.diaaut = '';
  row.dirter = getPreferredAddress(args.person);
  row.telter = getPreferredPhone(args.person);
  row.codciuter = cityCodes.cityCode;
  row.ciudadter = city?.name ?? '';
  row.coddepter = cityCodes.departmentCode;
  row.departamentoter = '';
  row.nomemp = args.employer?.businessName ?? args.person.employerBusinessName ?? '';
  row.diremp = args.employer?.homeAddress ?? args.employer?.workAddress ?? '';
  row.telemp =
    args.employer?.mobilePhone ?? args.employer?.homePhone ?? args.employer?.workPhone ?? '';
  row.codciuemp = employerCityCodes.cityCode;
  row.ciudademp = employerCity?.name ?? '';
  row.coddepemp = employerCityCodes.departmentCode;
  row.departamentoemp = '';
  row.feciniexcgmf = '';
  row.fecterexcgmf = '';
  row.numrencdt = '';
  row.ctaahoexegmf = '';
  row.tipideori = '';
  row.numideori = '';
  row.tipentori = '';
  row.codentori = '';
  row.tipfid = '';
  row.numfid = '';
  row.nomfid = '';
  row.tipdeucar = '';
  row.tippol = '';
  row.codram = '';
  row.numreatar = '';
  row.coremp = args.employer?.email ?? '';
  row.celemp = args.employer?.mobilePhone ?? '';

  return row;
}

export async function generateCifinReport(args: GenerateCifinReportArgs) {
  const creditCutoffDate = formatDbDate(args.creditCutoffDate);
  const paymentCutoffDate = formatDbDate(args.paymentCutoffDate);

  const candidateLoans = await db.query.loans.findMany({
    where: and(
      lte(loans.creditStartDate, creditCutoffDate),
      inArray(loans.status, ['ACCOUNTED', 'PAID']),
      eq(loans.disbursementStatus, 'DISBURSED')
    ),
    with: {
      borrower: {
        with: {
          identificationType: true,
          homeCity: true,
          workCity: true,
        },
      },
      loanApplication: {
        with: {
          creditProduct: true,
          repaymentMethod: true,
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
        },
      },
    },
    orderBy: (fields, operators) => [operators.asc(fields.creditNumber)],
  });

  const reviewedBase = candidateLoans.filter(
    (loan) => loan.loanApplication?.creditProduct?.reportsToCreditBureau === true
  );
  const reviewedCredits = reviewedBase.length;
  const reportableLoans = reviewedBase.filter((loan) =>
    shouldIncludePaidLoan({
      status: loan.status,
      isReportedToRiskCenter: loan.isReportedToRiskCenter,
      riskCenterReportDate: loan.riskCenterReportDate,
      lastPaymentDate: loan.lastPaymentDate,
    })
  );

  const loanIds = reportableLoans.map((loan) => loan.id);

  if (!loanIds.length) {
    return {
      reviewedCredits,
      reportedCredits: 0,
      rows: [] as Array<Record<string, string>>,
      fileContent: renderRows([]),
      paymentCutoffDate,
    };
  }

  const [receivableEntryRows, firstInstallmentRows, paymentRows] = await Promise.all([
    db
      .select({
        loanId: accountingEntries.loanId,
        installmentNumber: accountingEntries.installmentNumber,
        dueDate: accountingEntries.dueDate,
        nature: accountingEntries.nature,
        amount: accountingEntries.amount,
      })
      .from(accountingEntries)
      .innerJoin(glAccounts, eq(accountingEntries.glAccountId, glAccounts.id))
      .where(
        and(
          inArray(accountingEntries.loanId, loanIds),
          eq(accountingEntries.status, 'ACCOUNTED'),
          lte(accountingEntries.entryDate, paymentCutoffDate),
          eq(glAccounts.detailType, 'RECEIVABLE')
        )
      ),
    db
      .select({
        loanId: loanInstallments.loanId,
        principalAmount: loanInstallments.principalAmount,
        interestAmount: loanInstallments.interestAmount,
      })
      .from(loanInstallments)
      .where(
        and(
          inArray(loanInstallments.loanId, loanIds),
          eq(loanInstallments.installmentNumber, 1),
          sql`${loanInstallments.status} <> 'VOID'`
        )
      ),
    db
      .select({
        loanId: loanPayments.loanId,
        lastPaymentDate: sql<string>`max(${loanPayments.paymentDate})`,
      })
      .from(loanPayments)
      .where(and(inArray(loanPayments.loanId, loanIds), lte(loanPayments.paymentDate, paymentCutoffDate)))
      .groupBy(loanPayments.loanId),
  ]);

  const metricsByLoan = buildMetricsMap(receivableEntryRows, paymentCutoffDate);
  const firstInstallmentAmountByLoan = new Map<number, number>(
    firstInstallmentRows.map((row) => [
      row.loanId,
      roundMoney(toNumber(row.principalAmount) + toNumber(row.interestAmount)),
    ])
  );
  const latestPaymentByLoan = new Map<number, string | null>(
    paymentRows.map((row) => [row.loanId, row.lastPaymentDate ?? null])
  );

  const employerDocumentNumbers = new Set<string>();
  for (const loan of reportableLoans) {
    if (loan.borrower?.employerDocumentNumber) {
      employerDocumentNumbers.add(loan.borrower.employerDocumentNumber);
    }
    for (const item of loan.loanApplication?.loanApplicationCoDebtors ?? []) {
      if (item.thirdParty?.employerDocumentNumber) {
        employerDocumentNumbers.add(item.thirdParty.employerDocumentNumber);
      }
    }
  }

  const employerRows = employerDocumentNumbers.size
    ? await db.query.thirdParties.findMany({
        where: inArray(thirdParties.documentNumber, Array.from(employerDocumentNumbers)),
        with: {
          homeCity: true,
          workCity: true,
        },
      })
    : [];
  const employersByDocument = new Map(employerRows.map((row) => [row.documentNumber, row]));

  const rows: Array<Record<string, string>> = [];
  const items: RiskCenterLoanItem[] = [];

  for (const loan of reviewedBase) {
    const metrics = metricsByLoan.get(loan.id) ?? {
      currentBalance: 0,
      overdueBalance: 0,
      oldestOverdueDays: null,
      overdueInstallments: 0,
      openInstallments: 0,
      earliestOverdueDueDate: null,
    };
    const firstInstallmentAmount = firstInstallmentAmountByLoan.get(loan.id) ?? 0;
    const latestPaymentDate = latestPaymentByLoan.get(loan.id) ?? loan.lastPaymentDate ?? null;
    const repaymentMethodName = loan.loanApplication?.repaymentMethod?.name ?? null;
    const wasReported = reportableLoans.some((item) => item.id === loan.id);
    const reportedThirdPartiesCount = 1 + (loan.loanApplication?.loanApplicationCoDebtors?.length ?? 0);
    const reportedStatus =
      metrics.currentBalance <= 0.01
        ? 'PAID'
        : metrics.overdueInstallments > 0
          ? 'OVERDUE'
          : 'CURRENT';

    items.push({
      loanId: loan.id,
      wasReported,
      reportedStatus,
      daysPastDue: metrics.oldestOverdueDays ?? 0,
      currentBalance: metrics.currentBalance,
      overdueBalance: metrics.overdueBalance,
      reportedThirdPartiesCount,
      metadata: {
        overdueInstallments: metrics.overdueInstallments,
        openInstallments: metrics.openInstallments,
      },
    });

    if (!wasReported) continue;

    rows.push(
      buildCifinRow({
        person: loan.borrower,
        quality: 'P',
        employer: loan.borrower.employerDocumentNumber
          ? employersByDocument.get(loan.borrower.employerDocumentNumber) ?? null
          : null,
        loan: {
          creditNumber: loan.creditNumber,
          creditStartDate: loan.creditStartDate,
          maturityDate: loan.maturityDate,
          installments: loan.installments,
          principalAmount: loan.principalAmount,
        },
        loanMetrics: metrics,
        firstInstallmentAmount,
        paymentCutoffDate,
        latestPaymentDate,
        repaymentMethodName,
      })
    );

    for (const item of loan.loanApplication?.loanApplicationCoDebtors ?? []) {
      if (!item.thirdParty) continue;
      rows.push(
        buildCifinRow({
          person: item.thirdParty,
          quality: 'C',
          employer: item.thirdParty.employerDocumentNumber
            ? employersByDocument.get(item.thirdParty.employerDocumentNumber) ?? null
            : null,
          loan: {
            creditNumber: loan.creditNumber,
            creditStartDate: loan.creditStartDate,
            maturityDate: loan.maturityDate,
            installments: loan.installments,
            principalAmount: loan.principalAmount,
          },
          loanMetrics: metrics,
          firstInstallmentAmount,
          paymentCutoffDate,
          latestPaymentDate,
          repaymentMethodName,
        })
      );
    }
  }

  return {
    reviewedCredits,
    reportedCredits: reportableLoans.length,
    items,
    rows,
    fileContent: renderRows(rows),
    paymentCutoffDate,
  };
}
