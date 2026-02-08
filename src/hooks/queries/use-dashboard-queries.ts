import { api } from '@/clients/api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (accountingPeriodId: number) => [...dashboardKeys.all, 'summary', accountingPeriodId] as const,
};

export function useDashboardSummary(accountingPeriodId?: number) {
  const isEnabled = typeof accountingPeriodId === 'number' && accountingPeriodId > 0;

  return api.dashboard.getSummary.useQuery({
    queryKey: dashboardKeys.summary(accountingPeriodId ?? 0),
    queryData: {
      query: {
        accountingPeriodId: accountingPeriodId ?? 1,
      },
    },
    enabled: isEnabled,
  });
}
