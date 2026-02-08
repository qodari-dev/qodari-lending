import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchBillingCycleProfiles } from '@/hooks/queries/use-billing-cycle-profile-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { BillingCycleProfiles } from './components/billing-cycle-profiles';

export default async function BillingCycleProfilesPage() {
  const queryClient = new QueryClient();
  await prefetchBillingCycleProfiles(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Perfiles de facturacion' }]}
        permissionKey="billing-cycle-profiles:read"
      >
        <BillingCycleProfiles />
      </PageLayout>
    </HydrationBoundary>
  );
}
