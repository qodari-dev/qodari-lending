import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { CoDebtors } from './components/co-debtors';
import { prefetchCoDebtors } from '@/hooks/queries/use-co-debtor-queries';

export default async function CoDebtorsPage() {
  const queryClient = new QueryClient();
  await prefetchCoDebtors(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Codeudores' }]}
        permissionKey="co-debtors:read"
      >
        <CoDebtors />
      </PageLayout>
    </HydrationBoundary>
  );
}
