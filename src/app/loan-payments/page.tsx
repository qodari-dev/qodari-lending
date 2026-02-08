import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchLoanPayments } from '@/hooks/queries/use-loan-payment-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { LoanPayments } from './components/loan-payments';

export default async function LoanPaymentsPage() {
  const queryClient = new QueryClient();
  await prefetchLoanPayments(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Abonos' }]}
        permissionKey="loan-payments:read"
      >
        <LoanPayments />
      </PageLayout>
    </HydrationBoundary>
  );
}
