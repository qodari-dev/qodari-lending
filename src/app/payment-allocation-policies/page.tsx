import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchPaymentAllocationPolicies } from '@/hooks/queries/use-payment-allocation-policy-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { PaymentAllocationPolicies } from './components/payment-allocation-policies';

export default async function Page() {
  const queryClient = new QueryClient();
  await prefetchPaymentAllocationPolicies(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Configuracion' }, { label: 'Politicas de aplicacion' }]}
        permissionKey="payment-allocation-policies:read"
      >
        <PaymentAllocationPolicies />
      </PageLayout>
    </HydrationBoundary>
  );
}
