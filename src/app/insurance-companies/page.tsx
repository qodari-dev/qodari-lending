import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { InsuranceCompanies } from './components/insurance-companies';
import { prefetchInsuranceCompanies } from '@/hooks/queries/use-insurance-company-queries';

export default async function InsuranceCompaniesPage() {
  const queryClient = new QueryClient();
  await prefetchInsuranceCompanies(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Empresas de seguros' }]}
        permissionKey="insurance-companies:read"
      >
        <InsuranceCompanies />
      </PageLayout>
    </HydrationBoundary>
  );
}
