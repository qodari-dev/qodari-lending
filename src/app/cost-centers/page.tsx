import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { CostCenters } from './components/cost-centers';
import { prefetchCostCenters } from '@/hooks/queries/use-cost-center-queries';

export default async function CostCentersPage() {
  const queryClient = new QueryClient();
  await prefetchCostCenters(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Centros de costo' }]}
        permissionKey="cost-centers:read"
      >
        <CostCenters />
      </PageLayout>
    </HydrationBoundary>
  );
}
