import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchAgreements } from '@/hooks/queries/use-agreement-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Agreements } from './components/agreements';

export default async function AgreementsPage() {
  const queryClient = new QueryClient();
  await prefetchAgreements(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Convenios' }]}
        permissionKey="agreements:read"
      >
        <Agreements />
      </PageLayout>
    </HydrationBoundary>
  );
}
