import { monthsDiff } from '@/server/utils/string-utils';
import { roundMoney } from '@/server/utils/value-utils';
import { getSubsidyProvider } from './subsidy-provider-factory';
import type {
  SubsidyBeneficiary,
  SubsidyCompanyHistory,
  SubsidyContribution,
  SubsidyPayment,
  SubsidyWorker,
  SubsidyWorkerStudyData,
} from './subsidy.types';

type GetSubsidyWorkerStudyInput = {
  identificationTypeCode: string;
  documentNumber: string;
};

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
  beneficiaries: SubsidyBeneficiary[];
  contributions: SubsidyContribution[];
  subsidyPayments: SubsidyPayment[];
}): SubsidyWorkerStudyData {
  const { worker, beneficiaries, contributions, subsidyPayments } = params;

  const companyHistory = buildCompanyHistory(worker);

  // Cónyuges (puede haber varios históricos)
  const spouses = beneficiaries
    .filter((item) => isSpouseRelationship(item.relationship))
    .map((item) => ({
      fullName: item.fullName,
      documentNumber: item.documentNumber,
      birthDate: item.birthDate,
    }));

  const currentSalary = toSafeMoney(worker.currentSalary);

  return {
    source: params.source,
    worker,
    currentSalary,
    companyHistory,
    contributions,
    spouses,
    beneficiaries,
    subsidyPayments,
    notes: [
      `Fuente subsidio: ${params.source}.`,
      `Beneficiarios encontrados: ${beneficiaries.length}.`,
      ...(spouses.length > 0
        ? [`Conyuge(s) identificado(s): ${spouses.map((s) => s.fullName).join(', ')}.`]
        : []),
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

    const [worker, beneficiaries, contributions, subsidyPayments] = await Promise.all([
      provider.getWorker(lookup),
      provider.getBeneficiaries(lookup),
      provider.getContributions(lookup),
      provider.getSubsidyPayments(lookup),
    ]);

    if (!worker) {
      return null;
    }

    return buildStudyFromProvider({
      source: provider.key,
      worker,
      beneficiaries,
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
