import { PageLayout } from '@/components/sidebar/page-layout';
import { CausationBillingConcepts } from './components/causation-billing-concepts';

export default function CausationBillingConceptsPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Causacion' },
        { label: 'Otros conceptos' },
      ]}
      permissionKey="loans:read"
    >
      <CausationBillingConcepts />
    </PageLayout>
  );
}
