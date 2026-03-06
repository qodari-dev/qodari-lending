import { roundMoney } from '@/server/utils/value-utils';
import { getSubsidyProvider } from './subsidy-provider-factory';
import type { SubsidyBeneficiary, SubsidyWorker, SubsidyWorkerStudyData } from './subsidy.types';

type GetSubsidyWorkerStudyInput = {
  identificationTypeCode: string;
  documentNumber: string;
};

const CONTRIBUTION_RATE = 0.04;

function toSafeMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundMoney(value);
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function monthsDiff(fromDate: string | null, toDate: string | null) {
  if (!fromDate) return 0;
  const from = new Date(fromDate);
  const to = toDate ? new Date(toDate) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return 0;
  }

  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return Math.max(0, years * 12 + months + 1);
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

function pickSpouse(beneficiaries: SubsidyBeneficiary[]): SubsidyBeneficiary | null {
  return beneficiaries.find((item) => isSpouseRelationship(item.relationship)) ?? null;
}

function buildStudyFromProvider(params: {
  source: SubsidyWorkerStudyData['source'];
  worker: SubsidyWorker;
  beneficiaries: SubsidyBeneficiary[];
}): SubsidyWorkerStudyData {
  const worker = params.worker;
  const employments = worker.employments.length
    ? worker.employments
    : [
        {
          companyName: worker.companyName ?? 'Empresa sin nombre',
          companyDocumentNumber: null,
          currentSalary: worker.currentSalary,
          joinedCompanyAt: worker.joinedCompanyAt,
          leftCompanyAt: worker.leftCompanyAt,
          joinedSubsidyAt: worker.joinedSubsidyAt,
          isPrimary: true,
        },
      ];

  const companyHistory = employments.map((item) => {
    const fromDate = item.joinedCompanyAt ?? item.joinedSubsidyAt ?? '2000-01-01';
    const toDate = item.leftCompanyAt;
    const contributionMonths = monthsDiff(item.joinedSubsidyAt ?? item.joinedCompanyAt, toDate);

    return {
      companyName: item.companyName || 'Empresa sin nombre',
      fromDate,
      toDate,
      contributionMonths,
    };
  });

  const contributionRows = employments.map((item) => {
    const baseSalary = toSafeMoney(item.currentSalary);
    return {
      period: item.joinedSubsidyAt?.slice(0, 7) ?? item.joinedCompanyAt?.slice(0, 7) ?? currentPeriod(),
      companyName: item.companyName || 'Empresa sin nombre',
      contributionBaseSalary: baseSalary,
      contributionValue: toSafeMoney(baseSalary * CONTRIBUTION_RATE),
    };
  });

  const currentCompany = employments.find((item) => !item.leftCompanyAt) ?? employments[0];
  const previousCompany = employments.find(
    (item) => item.companyName !== currentCompany?.companyName && !!item.companyName
  );
  const spouse = pickSpouse(params.beneficiaries);

  const currentSalary = toSafeMoney(worker.currentSalary);

  return {
    source: params.source,
    workerName: worker.fullName,
    workerDocumentNumber: worker.documentNumber,
    salary: {
      currentSalary,
      averageSalaryLastSixMonths: currentSalary,
      highestSalaryLastSixMonths: currentSalary,
    },
    trajectory: {
      totalContributionMonths: companyHistory.reduce((sum, item) => sum + item.contributionMonths, 0),
      currentCompanyName: currentCompany?.companyName ?? worker.companyName,
      previousCompanyName: previousCompany?.companyName ?? null,
    },
    contributions: contributionRows,
    companyHistory,
    spouse: spouse
      ? { fullName: spouse.fullName, documentNumber: spouse.documentNumber }
      : null,
    notes: [
      `Fuente subsidio: ${params.source}.`,
      `Beneficiarios encontrados: ${params.beneficiaries.length}.`,
      ...(spouse ? [`Conyuge identificado: ${spouse.fullName}.`] : []),
    ],
  };
}

export async function getSubsidyWorkerStudy(
  input: GetSubsidyWorkerStudyInput
): Promise<SubsidyWorkerStudyData | null> {
  const provider = getSubsidyProvider();

  if (!provider) {
    return null;
  }

  try {
    const lookup = {
      identificationTypeCode: input.identificationTypeCode,
      documentNumber: input.documentNumber,
    };

    const [worker, beneficiaries] = await Promise.all([
      provider.getWorker(lookup),
      provider.getBeneficiaries(lookup),
    ]);

    if (!worker) {
      return null;
    }

    return buildStudyFromProvider({
      source: provider.key,
      worker,
      beneficiaries,
    });
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return null;
  }
}
