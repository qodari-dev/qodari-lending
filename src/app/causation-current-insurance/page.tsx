import { PageLayout } from '@/components/sidebar/page-layout';
import { CausationCurrentInsurance } from './components/causation-current-insurance';

export default function CausationCurrentInsurancePage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Causacion' },
        { label: 'Seguro' },
      ]}
      permissionKey="loans:read"
    >
      <CausationCurrentInsurance />
    </PageLayout>
  );
}
