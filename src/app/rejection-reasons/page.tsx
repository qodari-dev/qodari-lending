import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { RejectionReasons } from './components/rejection-reasons';
import { prefetchRejectionReasons } from '@/hooks/queries/use-rejection-reason-queries';

export default async function RejectionReasonsPage() {
  const queryClient = new QueryClient();
  await prefetchRejectionReasons(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Motivos de rechazo' }]}
        permissionKey="rejection-reasons:read"
      >
        <RejectionReasons />
      </PageLayout>
    </HydrationBoundary>
  );
}
