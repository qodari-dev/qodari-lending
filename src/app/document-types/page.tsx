import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { DocumentTypes } from './components/document-types';
import { prefetchDocumentTypes } from '@/hooks/queries/use-document-type-queries';

export default async function DocumentTypesPage() {
  const queryClient = new QueryClient();
  await prefetchDocumentTypes(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Tipos de documentos' }]}
        permissionKey="document-types:read"
      >
        <DocumentTypes />
      </PageLayout>
    </HydrationBoundary>
  );
}
