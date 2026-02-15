import { PageLayout } from '@/components/sidebar/page-layout';
import { SubsidyPledgePaymentVoucher } from '../components/subsidy-pledge-payment-voucher';

export default function SubsidyPledgePaymentVoucherPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Subsidio' },
        { label: 'Genera comprobante de abonos de pignoracion' },
      ]}
      permissionKey="loans:read"
    >
      <SubsidyPledgePaymentVoucher />
    </PageLayout>
  );
}
