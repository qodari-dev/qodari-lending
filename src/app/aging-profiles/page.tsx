import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { AgingProfiles } from './components/aging-profiles';
import { prefetchAgingProfiles } from '@/hooks/queries/use-aging-profile-queries';

export default async function AgingProfilesPage() {
  const queryClient = new QueryClient();
  await prefetchAgingProfiles(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Perfiles de aging' }]}
        permissionKey="aging-profiles:read"
      >
        <AgingProfiles />
      </PageLayout>
    </HydrationBoundary>
  );
}
