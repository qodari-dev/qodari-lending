import { PageLayout } from '@/components/sidebar/page-layout';
import { CausationPeriodClosing } from './components/causation-period-closing';

export default function CausationPeriodClosingPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Causacion' },
        { label: 'Cierre de periodo' },
      ]}
      permissionKey="loans:read"
    >
      <CausationPeriodClosing />
    </PageLayout>
  );
}
