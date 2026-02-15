import { PageLayout } from '@/components/sidebar/page-layout';
import { LoanPaymentFile } from './components/loan-payment-file';

export default function LoanPaymentFilePage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Abonos' }, { label: 'Abono por archivo' }]}
      permissionKey="loan-payments:create"
    >
      <LoanPaymentFile />
    </PageLayout>
  );
}
