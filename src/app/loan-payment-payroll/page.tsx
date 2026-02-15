import { PageLayout } from '@/components/sidebar/page-layout';
import { LoanPaymentPayroll } from './components/loan-payment-payroll';

export default function LoanPaymentPayrollPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Abonos' }, { label: 'Abono por libranza' }]}
      permissionKey="loan-payments:create"
    >
      <LoanPaymentPayroll />
    </PageLayout>
  );
}
