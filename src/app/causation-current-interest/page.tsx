import { PageLayout } from '@/components/sidebar/page-layout';
import { CausationCurrentInterest } from './components/causation-current-interest';

export default function CausationCurrentInterestPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Causacion' },
        { label: 'Interes corriente' },
      ]}
      permissionKey="loans:read"
    >
      <CausationCurrentInterest />
    </PageLayout>
  );
}
