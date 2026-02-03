import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Banks } from './components/banks';
import { prefetchBanks } from '@/hooks/queries/use-bank-queries';

export default async function BanksPage() {
  const queryClient = new QueryClient();
  await prefetchBanks(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Bancos' }]}
        permissionKey="banks:read"
      >
        <Banks />
      </PageLayout>
    </HydrationBoundary>
  );
}
