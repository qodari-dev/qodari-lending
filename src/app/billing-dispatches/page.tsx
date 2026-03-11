import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchBillingDispatches } from '@/hooks/queries/use-billing-dispatch-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { BillingDispatches } from './components/billing-dispatches';

export default async function BillingDispatchesPage() {
  const queryClient = new QueryClient();
  await prefetchBillingDispatches(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Instrucciones de cobro' }]}
        permissionKey="agreements:read"
      >
        <BillingDispatches />
      </PageLayout>
    </HydrationBoundary>
  );
}
