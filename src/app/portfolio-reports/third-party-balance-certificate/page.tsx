import { PageLayout } from '@/components/sidebar/page-layout';
import { ThirdPartyBalanceCertificateReport } from './components/third-party-balance-certificate-report';

export default function PortfolioThirdPartyBalanceCertificateReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Certificado de saldo del tercero' },
      ]}
      permissionKey="loans:read"
    >
      <ThirdPartyBalanceCertificateReport />
    </PageLayout>
  );
}
