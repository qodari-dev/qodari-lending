import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchLoanApprovalLevels } from '@/hooks/queries/use-loan-approval-level-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { LoanApprovalLevels } from './components/loan-approval-levels';

export default async function LoanApprovalLevelsPage() {
  const queryClient = new QueryClient();
  await prefetchLoanApprovalLevels(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Niveles de aprobacion' }]}
        permissionKey="loan-approval-levels:read"
      >
        <LoanApprovalLevels />
      </PageLayout>
    </HydrationBoundary>
  );
}
