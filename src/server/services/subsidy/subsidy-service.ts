import { extractUnknownErrorMessage } from '@/server/utils/error-utils';
import { roundMoney } from '@/server/utils/value-utils';
import { getSubsidyProvider } from './subsidy-provider-factory';
import type { SubsidyBeneficiary, SubsidyWorker, SubsidyWorkerStudyData } from './subsidy.types';

type GetSubsidyWorkerStudyInput = {
  identificationTypeCode: string;
  documentNumber: string;
  fallbackWorkerName: string;
  fallbackEmployerBusinessName: string | null;
};

const MOCK_SALARY_BASE = 1_800_000;
const MOCK_SALARY_INCREMENT_PER_DIGIT = 15_000;
const MOCK_SALARY_AVERAGE_FACTOR = 0.96;
const MOCK_SALARY_HIGHEST_FACTOR = 1.08;
const MOCK_CONTRIBUTION_RATE = 0.04;
const MOCK_CONTRIBUTION_PERIODS = [
  '2025-09',
  '2025-10',
  '2025-11',
  '2025-12',
  '2026-01',
  '2026-02',
] as const;

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

function buildMockWorkerStudy(
  input: GetSubsidyWorkerStudyInput,
  note: string
): SubsidyWorkerStudyData {
  const documentTail = Number(input.documentNumber.replace(/\D/g, '').slice(-2) || '0');
  const salaryBase = MOCK_SALARY_BASE + documentTail * MOCK_SALARY_INCREMENT_PER_DIGIT;
  const currentSalary = roundMoney(salaryBase);
  const companyName = input.fallbackEmployerBusinessName ?? 'Servicios Integrales SAS';

  return {
    source: 'MOCK',
    workerName: input.fallbackWorkerName,
    workerDocumentNumber: input.documentNumber,
    salary: {
      currentSalary,
      averageSalaryLastSixMonths: roundMoney(salaryBase * MOCK_SALARY_AVERAGE_FACTOR),
      highestSalaryLastSixMonths: roundMoney(salaryBase * MOCK_SALARY_HIGHEST_FACTOR),
    },
    trajectory: {
      totalContributionMonths: 92,
      currentCompanyName: companyName,
      previousCompanyName: input.fallbackEmployerBusinessName ? null : 'Comercial Andina LTDA',
    },
    contributions: MOCK_CONTRIBUTION_PERIODS.map((period) => ({
      period,
      companyName,
      contributionBaseSalary: currentSalary,
      contributionValue: roundMoney(currentSalary * MOCK_CONTRIBUTION_RATE),
    })),
    companyHistory: [
      {
        companyName,
        fromDate: '2022-03-01',
        toDate: null,
        contributionMonths: 47,
      },
      ...(input.fallbackEmployerBusinessName
        ? []
        : [
            {
              companyName: 'Comercial Andina LTDA',
              fromDate: '2018-01-01',
              toDate: '2022-02-28',
              contributionMonths: 50,
            },
          ]),
    ],
    notes: [note],
  };
}

function pickSpouse(beneficiaries: SubsidyBeneficiary[]): SubsidyBeneficiary | null {
  const spouse = beneficiaries.find((item) => {
    const relationship = (item.relationship ?? '').toUpperCase();
    return (
      relationship.includes('CONYUGE') ||
      relationship.includes('COMPANER') ||
      relationship.includes('ESPOS') ||
      relationship.includes('PAREJA')
    );
  });
  return spouse ?? null;
}

function buildStudyFromProvider(params: {
  source: 'COMFENALCO' | 'SYSEU';
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
      contributionValue: toSafeMoney(baseSalary * MOCK_CONTRIBUTION_RATE),
    };
  });

  const currentCompany = employments.find((item) => !item.leftCompanyAt) ?? employments[0];
  const previousCompany = employments.find(
    (item) => item.companyName !== currentCompany?.companyName && !!item.companyName
  );
  const spouse = pickSpouse(params.beneficiaries);

  return {
    source: params.source,
    workerName: worker.fullName,
    workerDocumentNumber: worker.documentNumber,
    salary: {
      currentSalary: toSafeMoney(worker.currentSalary),
      averageSalaryLastSixMonths: toSafeMoney(worker.currentSalary * MOCK_SALARY_AVERAGE_FACTOR),
      highestSalaryLastSixMonths: toSafeMoney(worker.currentSalary * MOCK_SALARY_HIGHEST_FACTOR),
    },
    trajectory: {
      totalContributionMonths: companyHistory.reduce((sum, item) => sum + item.contributionMonths, 0),
      currentCompanyName: currentCompany?.companyName ?? worker.companyName,
      previousCompanyName: previousCompany?.companyName ?? null,
    },
    contributions: contributionRows,
    companyHistory,
    notes: [
      `Fuente subsidio: ${params.source}.`,
      `Beneficiarios encontrados: ${params.beneficiaries.length}.`,
      ...(spouse ? [`Conyuge identificado: ${spouse.fullName}.`] : []),
    ],
  };
}

export async function getSubsidyWorkerStudy(
  input: GetSubsidyWorkerStudyInput
): Promise<SubsidyWorkerStudyData> {
  const provider = getSubsidyProvider();

  if (!provider) {
    return buildMockWorkerStudy(
      input,
      'Subsidio en modo MOCK. Configure SUBSIDY_PROVIDER para usar un proveedor real.'
    );
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
      return buildMockWorkerStudy(
        input,
        `Proveedor ${provider.key} sin datos del trabajador. Se usan datos demo.`
      );
    }

    const study = buildStudyFromProvider({
      source: provider.key,
      worker,
      beneficiaries,
    });

    return {
      ...study,
      source: provider.key,
    };
  } catch (error) {
    console.error('[subsidy-service] provider error', error);
    return buildMockWorkerStudy(
      input,
      `Fallo consultando proveedor de subsidio: ${extractUnknownErrorMessage(error, 'error desconocido')}.`
    );
  }
}
