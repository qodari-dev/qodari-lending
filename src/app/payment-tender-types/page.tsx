import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { PaymentTenderTypes } from './components/payment-tender-types';
import { prefetchPaymentTenderTypes } from '@/hooks/queries/use-payment-tender-type-queries';

export default async function PaymentTenderTypesPage() {
  const queryClient = new QueryClient();
  await prefetchPaymentTenderTypes(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Medios de Pago' }]}
        permissionKey="payment-tender-types:read"
      >
        <PaymentTenderTypes />
      </PageLayout>
    </HydrationBoundary>
  );
}
