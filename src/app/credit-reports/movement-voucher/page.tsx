import { PageLayout } from '@/components/sidebar/page-layout';
import { MovementVoucherReport } from './components/movement-voucher-report';

export default function MovementVoucherReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Comprobante de Movimientos' },
      ]}
      permissionKey="report-credits:read"
    >
      <MovementVoucherReport />
    </PageLayout>
  );
}
