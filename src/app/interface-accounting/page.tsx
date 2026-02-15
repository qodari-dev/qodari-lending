import { PageLayout } from '@/components/sidebar/page-layout';
import { InterfaceAccountingCredits } from './components/interface-accounting-credits';

export default function InterfaceAccountingPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Interface Contable' },
        { label: 'Creditos' },
      ]}
      permissionKey="loans:read"
    >
      <InterfaceAccountingCredits />
    </PageLayout>
  );
}
