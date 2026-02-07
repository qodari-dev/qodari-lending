import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { AffiliationOffices } from './components/affiliation-offices';
import { prefetchAffiliationOffices } from '@/hooks/queries/use-affiliation-office-queries';

export default async function AffiliationOfficesPage() {
  const queryClient = new QueryClient();
  await prefetchAffiliationOffices(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Oficinas de afiliacion' }]}
        permissionKey="affiliation-offices:read"
      >
        <AffiliationOffices />
      </PageLayout>
    </HydrationBoundary>
  );
}
