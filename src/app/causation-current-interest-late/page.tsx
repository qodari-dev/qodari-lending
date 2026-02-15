import { PageLayout } from '@/components/sidebar/page-layout';
import { CausationCurrentInterestLate } from './components/causation-current-interest-late';

export default function CausationCurrentInterestLatePage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Causacion' },
        { label: 'Interes mora' },
      ]}
      permissionKey="loans:read"
    >
      <CausationCurrentInterestLate />
    </PageLayout>
  );
}
