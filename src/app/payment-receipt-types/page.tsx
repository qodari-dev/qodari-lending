import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { PaymentReceiptTypes } from './components/payment-receipt-types';
import { prefetchPaymentReceiptTypes } from '@/hooks/queries/use-payment-receipt-type-queries';

export default async function PaymentReceiptTypesPage() {
  const queryClient = new QueryClient();
  await prefetchPaymentReceiptTypes(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Tipos de recibos de abonos' }]}
        permissionKey="payment-receipt-types:read"
      >
        <PaymentReceiptTypes />
      </PageLayout>
    </HydrationBoundary>
  );
}
