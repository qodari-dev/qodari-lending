import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchLoanApplications } from '@/hooks/queries/use-loan-application-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { LoanApplications } from './components/loan-applications';

export default async function LoanApplicationsPage() {
  const queryClient = new QueryClient();
  await prefetchLoanApplications(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Solicitudes de credito' }]}
        permissionKey="loan-applications:read"
      >
        <LoanApplications />
      </PageLayout>
    </HydrationBoundary>
  );
}
