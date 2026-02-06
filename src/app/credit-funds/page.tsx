import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { CreditFunds } from './components/credit-funds';
import { prefetchCreditFunds } from '@/hooks/queries/use-credit-fund-queries';

export default async function CreditFundsPage() {
  const queryClient = new QueryClient();
  await prefetchCreditFunds(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Fondos de creditos' }]}
        permissionKey="credit-funds:read"
      >
        <CreditFunds />
      </PageLayout>
    </HydrationBoundary>
  );
}
