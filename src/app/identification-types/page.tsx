import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { IdentificationTypes } from './components/identification-types';
import { prefetchIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';

export default async function IdentificationTypesPage() {
  const queryClient = new QueryClient();
  await prefetchIdentificationTypes(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Tipos de Identificación' }]}
        permissionKey="identification-types:read"
      >
        <IdentificationTypes />
      </PageLayout>
    </HydrationBoundary>
  );
}
