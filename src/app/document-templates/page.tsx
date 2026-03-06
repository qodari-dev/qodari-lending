import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { prefetchDocumentTemplates } from '@/hooks/queries/use-document-template-queries';
import { DocumentTemplates } from './components/document-templates';

export default async function DocumentTemplatesPage() {
  const queryClient = new QueryClient();
  await prefetchDocumentTemplates(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Plantillas de firma' }]}
        permissionKey="document-templates:read"
      >
        <DocumentTemplates />
      </PageLayout>
    </HydrationBoundary>
  );
}
