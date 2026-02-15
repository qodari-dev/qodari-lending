import { PageLayout } from '@/components/sidebar/page-layout';
import { WorkerStudy } from './components/worker-study';

export default function WorkerStudyPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Estudio de credito' }, { label: 'Estudio trabajador' }]}
      permissionKey="credit-simulation:read"
    >
      <WorkerStudy />
    </PageLayout>
  );
}
