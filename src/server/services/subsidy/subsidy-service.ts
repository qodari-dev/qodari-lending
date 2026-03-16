import { env } from '@/env';
import { db, creditsSettings } from '@/server/db';
import { monthsDiff } from '@/server/utils/string-utils';
import { roundMoney } from '@/server/utils/value-utils';
import { eq } from 'drizzle-orm';
import { getSubsidyProvider } from './subsidy-provider-factory';
import type {
  SubsidyBeneficiary,
  SubsidyPledgeCreationInput,
  SubsidyCurrentPeriod,
  SubsidyCompanyHistory,
  SubsidyContribution,
  SubsidyPayment,
  SubsidyPledge,
  SubsidySalaryHistory,
  SubsidySpouse,
  SubsidyWorker,
  SubsidyWorkerStudyData,
} from './subsidy.types';

type GetSubsidyWorkerStudyInput = {
  identificationTypeCode: string;
  documentNumber: string;
};

async function isSubsidyEnabled(): Promise<boolean> {
  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
    columns: {
      subsidyEnabled: true,
    },
  });

  return settings?.subsidyEnabled ?? false;
}

function toSafeMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundMoney(value);
}

function isSpouseRelationship(value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.toUpperCase();
  return (
    normalized.includes('CONYUGE') ||
    normalized.includes('COMPANER') ||
    normalized.includes('ESPOS') ||
    normalized.includes('PAREJA')
  );
}

function buildCompanyHistory(worker: SubsidyWorker): SubsidyCompanyHistory[] {
  const employments = worker.employments.length
    ? worker.employments
    : [
        {
          companyName: worker.companyName ?? 'Empresa sin nombre',
          companyDocumentNumber: null as string | null,
          currentSalary: worker.currentSalary,
          joinedCompanyAt: worker.joinedCompanyAt,
          leftCompanyAt: worker.leftCompanyAt,
          joinedSubsidyAt: worker.joinedSubsidyAt,
          isPrimary: true,
        },
      ];

  return employments.map((item) => {
    const fromDate = item.joinedCompanyAt ?? item.joinedSubsidyAt ?? '2000-01-01';
    const toDate = item.leftCompanyAt;
    const contributionMonths = monthsDiff(item.joinedSubsidyAt ?? item.joinedCompanyAt, toDate);

    return {
      companyName: item.companyName || 'Empresa sin nombre',
      companyDocumentNumber: item.companyDocumentNumber,
      fromDate,
      toDate,
      contributionMonths,
    };
  });
}

function buildStudyFromProvider(params: {
  source: SubsidyWorkerStudyData['source'];
  worker: SubsidyWorker;
  spouses: SubsidySpouse[];
  beneficiaries: SubsidyBeneficiary[];
  salaryHistory: SubsidySalaryHistory[];
  contributions: SubsidyContribution[];
  subsidyPayments: SubsidyPayment[];
}): SubsidyWorkerStudyData {
  const { worker, spouses, beneficiaries, salaryHistory, contributions, subsidyPayments } = params;

  const companyHistory = buildCompanyHistory(worker);
  const nonSpouseBeneficiaries = beneficiaries.filter((item) => !isSpouseRelationship(item.relationship));

  const currentSalary = toSafeMoney(worker.currentSalary);

  return {
    source: params.source,
    worker,
    currentSalary,
    companyHistory,
    salaryHistory,
    contributions,
    spouses: spouses.map((item) => ({
      fullName: item.fullName,
      documentNumber: item.documentNumber,
      birthDate: item.birthDate,
      relationship: item.relationship,
      isPermanentPartner: item.isPermanentPartner,
    })),
    beneficiaries: nonSpouseBeneficiaries,
    subsidyPayments,
    notes: [
      `Fuente subsidio: ${params.source}.`,
      `Beneficiarios encontrados: ${nonSpouseBeneficiaries.length}.`,
      ...(spouses.length > 0
        ? [`Conyuge(s) identificado(s): ${spouses.map((s) => s.fullName).join(', ')}.`]
        : []),
    ],
  };
}

export async function getSubsidyWorkerStudy(
  input: GetSubsidyWorkerStudyInput
): Promise<SubsidyWorkerStudyData | null> {
  if (!(await isSubsidyEnabled())) {
    return null;
  }

  const provider = getSubsidyProvider();

  if (!provider) {
    return null;
  }

  try {
    const lookup = {
      identificationTypeCode: input.identificationTypeCode,
      documentNumber: input.documentNumber,
    };

    const [worker, beneficiaries, salaryHistory, contributions, subsidyPayments] = await Promise.all([
      provider.getWorker(lookup),
      provider.getBeneficiaries(lookup),
      provider.getSalaryHistory(lookup),
      provider.getContributions(lookup),
      provider.getSubsidyPayments(lookup),
    ]);

    if (!worker) {
      return null;
    }

    const spouses = provider.getSpouses
      ? await provider.getSpouses(lookup)
      : beneficiaries
          .filter((item) => isSpouseRelationship(item.relationship))
          .map((item) => ({
            fullName: item.fullName,
            documentNumber: item.documentNumber,
            identificationTypeCode: item.identificationTypeCode,
            relationship: item.relationship,
            birthDate: item.birthDate,
            isPermanentPartner: false,
          }));

    return buildStudyFromProvider({
      source: provider.key,
      worker,
      spouses,
      beneficiaries,
      salaryHistory,
      contributions,
      subsidyPayments,
    });
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return null;
  }
}

export async function getSubsidyWorkerBasicData(
  input: GetSubsidyWorkerStudyInput
): Promise<Pick<SubsidyWorkerStudyData, 'source' | 'worker'> | null> {
  if (!(await isSubsidyEnabled())) {
    return null;
  }

  const provider = getSubsidyProvider();

  if (!provider) {
    return null;
  }

  try {
    const worker = await provider.getWorker({
      identificationTypeCode: input.identificationTypeCode,
      documentNumber: input.documentNumber,
    });

    if (!worker) {
      return null;
    }

    return {
      source: provider.key,
      worker,
    };
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return null;
  }
}

export async function getSubsidyCurrentPeriod(): Promise<{
  source: SubsidyWorkerStudyData['source'];
  period: SubsidyCurrentPeriod;
} | null> {
  if (!(await isSubsidyEnabled())) {
    return null;
  }

  const provider = getSubsidyProvider();

  if (!provider) {
    return null;
  }

  try {
    const period = await provider.getCurrentPeriod();

    if (!period) {
      return null;
    }

    return {
      source: provider.key,
      period,
    };
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return null;
  }
}

export async function getSubsidyPledges(input: GetSubsidyWorkerStudyInput): Promise<{
  source: SubsidyWorkerStudyData['source'];
  pledges: SubsidyPledge[];
} | null> {
  if (!(await isSubsidyEnabled())) {
    return null;
  }

  const provider = getSubsidyProvider();

  if (!provider) {
    return null;
  }

  try {
    const pledges = await provider.getPledges({
      identificationTypeCode: input.identificationTypeCode,
      documentNumber: input.documentNumber,
    });

    return {
      source: provider.key,
      pledges,
    };
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return null;
  }
}

export async function getSubsidyPaymentsByPeriod(period: string): Promise<{
  source: SubsidyWorkerStudyData['source'];
  payments: SubsidyPayment[];
} | null> {
  if (!(await isSubsidyEnabled())) {
    return null;
  }

  const provider = getSubsidyProvider();

  if (!provider) {
    return null;
  }

  try {
    const payments = await provider.getSubsidyPaymentsByPeriod(period);

    return {
      source: provider.key,
      payments,
    };
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return null;
  }
}

export async function getSubsidyPledgeByMarkDocument(
  mark: string,
  documentNumber: string
): Promise<{
  source: SubsidyWorkerStudyData['source'];
  pledge: SubsidyPledge | null;
} | null> {
  if (!(await isSubsidyEnabled())) {
    return null;
  }

  const provider = getSubsidyProvider();

  if (!provider) {
    return null;
  }

  try {
    const pledge = await provider.getPledgeByMarkDocument(mark, documentNumber);

    return {
      source: provider.key,
      pledge,
    };
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return null;
  }
}

export async function createSubsidyPledge(input: SubsidyPledgeCreationInput): Promise<boolean> {
  if (!(await isSubsidyEnabled())) {
    return false;
  }

  const provider = getSubsidyProvider();

  if (!provider?.createPledge) {
    return false;
  }

  try {
    await provider.createPledge(input);
    return true;
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return false;
  }
}
