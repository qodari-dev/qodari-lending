import { api } from '@/clients/api';

export const reportCreditKeys = {
  all: ['report-credits'] as const,
  extract: (creditNumber: string) => [...reportCreditKeys.all, 'extract', creditNumber] as const,
};

export function useCreditExtractReport(creditNumber: string, enabled = true) {
  return api.reportCredit.getExtract.useQuery({
    queryKey: reportCreditKeys.extract(creditNumber),
    queryData: {
      query: {
        creditNumber,
      },
    },
    enabled: enabled && !!creditNumber.trim(),
  });
}
