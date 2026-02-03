import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { GlAccounts } from './components/gl-accounts';
import { prefetchGlAccounts } from '@/hooks/queries/use-gl-account-queries';

export default async function GlAccountsPage() {
  const queryClient = new QueryClient();
  await prefetchGlAccounts(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Plan unico de cuentas' }]}
        permissionKey="gl-accounts:read"
      >
        <GlAccounts />
      </PageLayout>
    </HydrationBoundary>
  );
}
