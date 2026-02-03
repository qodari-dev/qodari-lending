import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { InvestmentTypes } from './components/investment-types';
import { prefetchInvestmentTypes } from '@/hooks/queries/use-investment-type-queries';

export default async function InvestmentTypesPage() {
  const queryClient = new QueryClient();
  await prefetchInvestmentTypes(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Tipos de inversión' }]}
        permissionKey="investment-types:read"
      >
        <InvestmentTypes />
      </PageLayout>
    </HydrationBoundary>
  );
}
