import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ThirdPartyTypes } from './components/third-party-types';
import { prefetchThirdPartyTypes } from '@/hooks/queries/use-third-party-type-queries';

export default async function ThirdPartyTypesPage() {
  const queryClient = new QueryClient();
  await prefetchThirdPartyTypes(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Tipos de terceros' }]}
        permissionKey="third-party-types:read"
      >
        <ThirdPartyTypes />
      </PageLayout>
    </HydrationBoundary>
  );
}
