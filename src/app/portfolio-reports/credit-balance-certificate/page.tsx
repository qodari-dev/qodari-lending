import { PageLayout } from '@/components/sidebar/page-layout';
import { CreditBalanceCertificateReport } from './components/credit-balance-certificate-report';

export default function PortfolioCreditBalanceCertificateReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Certificado de saldo del credito' },
      ]}
      permissionKey="loans:read"
    >
      <CreditBalanceCertificateReport />
    </PageLayout>
  );
}
