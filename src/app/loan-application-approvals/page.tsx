import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchLoanApplicationInbox } from '@/hooks/queries/use-loan-application-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { LoanApplicationApprovals } from './components/loan-application-approvals';

export default async function LoanApplicationApprovalsPage() {
  const queryClient = new QueryClient();
  await prefetchLoanApplicationInbox(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Aprobacion de solicitudes' }]}
        permissionKey="loan-applications:approve"
      >
        <LoanApplicationApprovals />
      </PageLayout>
    </HydrationBoundary>
  );
}
