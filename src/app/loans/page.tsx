import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchLoans } from '@/hooks/queries/use-loan-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Loans } from './components/loans';

export default async function LoansPage() {
  const queryClient = new QueryClient();
  await prefetchLoans(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Creditos' }]}
        permissionKey="loans:read"
      >
        <Loans />
      </PageLayout>
    </HydrationBoundary>
  );
}
