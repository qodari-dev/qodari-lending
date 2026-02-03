import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { PaymentGuaranteeTypes } from './components/payment-guarantee-types';
import { prefetchPaymentGuaranteeTypes } from '@/hooks/queries/use-payment-guarantee-type-queries';

export default async function PaymentGuaranteeTypesPage() {
  const queryClient = new QueryClient();
  await prefetchPaymentGuaranteeTypes(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Garantías de pago' }]}
        permissionKey="payment-guarantee-types:read"
      >
        <PaymentGuaranteeTypes />
      </PageLayout>
    </HydrationBoundary>
  );
}
