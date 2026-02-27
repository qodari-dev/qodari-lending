import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchBillingEmailTemplates } from '@/hooks/queries/use-billing-email-template-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { BillingEmailTemplates } from './components/billing-email-templates';

export default async function BillingEmailTemplatesPage() {
  const queryClient = new QueryClient();
  await prefetchBillingEmailTemplates(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Plantillas de correo' }]}
        permissionKey="billing-email-templates:read"
      >
        <BillingEmailTemplates />
      </PageLayout>
    </HydrationBoundary>
  );
}
