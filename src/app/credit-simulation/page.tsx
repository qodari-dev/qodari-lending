import { PageLayout } from '@/components/sidebar/page-layout';
import { CreditSimulation } from './components/credit-simulation';

export default function CreditSimulationPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Simulacion de credito' }]}
      permissionKey="credit-simulation:read"
    >
      <CreditSimulation />
    </PageLayout>
  );
}
