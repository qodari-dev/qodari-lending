import { PageLayout } from '@/components/sidebar/page-layout';
import { LoanRefinancing } from './components/loan-refinancing';

export default function LoanRefinancingPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Refinanciacion' }]}
      permissionKey="loans:read"
    >
      <LoanRefinancing />
    </PageLayout>
  );
}
