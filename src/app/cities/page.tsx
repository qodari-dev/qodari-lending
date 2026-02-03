import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Cities } from './components/cities';
import { prefetchCities } from '@/hooks/queries/use-city-queries';

export default async function CitiesPage() {
  const queryClient = new QueryClient();
  await prefetchCities(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Ciudades' }]}
        permissionKey="cities:read"
      >
        <Cities />
      </PageLayout>
    </HydrationBoundary>
  );
}
