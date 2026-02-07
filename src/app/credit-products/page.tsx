import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { CreditProducts } from './components/credit-products';

export default async function CreditProductsPage() {
  const queryClient = new QueryClient();
  await prefetchCreditProducts(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Tipos de creditos' }]}
        permissionKey="credit-products:read"
      >
        <CreditProducts />
      </PageLayout>
    </HydrationBoundary>
  );
}
