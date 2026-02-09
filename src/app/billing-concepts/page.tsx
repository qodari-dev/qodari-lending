import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchBillingConcepts } from '@/hooks/queries/use-billing-concept-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { BillingConcepts } from './components/billing-concepts';

export default async function BillingConceptsPage() {
  const queryClient = new QueryClient();
  await prefetchBillingConcepts(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Conceptos de facturacion' }]}
        permissionKey="billing-concepts:read"
      >
        <BillingConcepts />
      </PageLayout>
    </HydrationBoundary>
  );
}
