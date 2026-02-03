import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ThirdParties } from './components/third-parties';
import { prefetchThirdParties } from '@/hooks/queries/use-third-party-queries';

export default async function ThirdPartiesPage() {
  const queryClient = new QueryClient();
  await prefetchThirdParties(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Terceros' }]}
        permissionKey="third-parties:read"
      >
        <ThirdParties />
      </PageLayout>
    </HydrationBoundary>
  );
}
