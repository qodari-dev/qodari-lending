import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { RepaymentMethods } from './components/repayment-methods';
import { prefetchRepaymentMethods } from '@/hooks/queries/use-repayment-method-queries';

export default async function RepaymentMethodsPage() {
  const queryClient = new QueryClient();
  await prefetchRepaymentMethods(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Formas de pago' }]}
        permissionKey="repayment-methods:read"
      >
        <RepaymentMethods />
      </PageLayout>
    </HydrationBoundary>
  );
}
