import { PageLayout } from '@/components/sidebar/page-layout';
import { BankFiles } from './components/bank-files';

export default function BankFilesPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Archivos para bancos' },
      ]}
      permissionKey="loans:read"
    >
      <BankFiles />
    </PageLayout>
  );
}
