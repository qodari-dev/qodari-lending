import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchProcessRuns } from '@/hooks/queries/use-process-run-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ProcessRuns } from './components/process-runs';

export default async function ProcessRunsPage() {
  const queryClient = new QueryClient();
  await prefetchProcessRuns(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Movimientos' },
          { label: 'Causacion' },
          { label: 'Corridas' },
        ]}
        permissionKey="loans:read"
      >
        <ProcessRuns />
      </PageLayout>
    </HydrationBoundary>
  );
}
