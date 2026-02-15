import { PageLayout } from '@/components/sidebar/page-layout';
import { LoanWriteOff } from './components/loan-write-off';

export default function LoanWriteOffPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Movimientos' }, { label: 'Castiga Cartera' }]}
      permissionKey="loans:read"
    >
      <LoanWriteOff />
    </PageLayout>
  );
}
