import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { PaymentFrequencies } from './components/payment-frequencies';
import { prefetchPaymentFrequencies } from '@/hooks/queries/use-payment-frequency-queries';

export default async function PaymentFrequenciesPage() {
  const queryClient = new QueryClient();
  await prefetchPaymentFrequencies(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Periodicidad de pagos' }]}
        permissionKey="payment-frequencies:read"
      >
        <PaymentFrequencies />
      </PageLayout>
    </HydrationBoundary>
  );
}
