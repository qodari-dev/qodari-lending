import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { AccountingPeriods } from './components/accounting-periods';
import { prefetchAccountingPeriods } from '@/hooks/queries/use-accounting-period-queries';

export default async function AccountingPeriodsPage() {
  const queryClient = new QueryClient();
  await prefetchAccountingPeriods(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Periodos Contables' }]}
        permissionKey="accounting-periods:read"
      >
        <AccountingPeriods />
      </PageLayout>
    </HydrationBoundary>
  );
}
