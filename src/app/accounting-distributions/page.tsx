import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { AccountingDistributions } from './components/accounting-distributions';
import { prefetchAccountingDistributions } from '@/hooks/queries/use-accounting-distribution-queries';

export default async function AccountingDistributionsPage() {
  const queryClient = new QueryClient();
  await prefetchAccountingDistributions(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Distribuciones contables' }]}
        permissionKey="accounting-distributions:read"
      >
        <AccountingDistributions />
      </PageLayout>
    </HydrationBoundary>
  );
}
