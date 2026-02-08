import { PageLayout } from '@/components/sidebar/page-layout';
import { Dashboard } from './components/dashboard';

export default function DashboardPage() {
  return (
    <PageLayout breadcrumbs={[{ label: 'Dashboard' }]} permissionKey="dashboard:read">
      <Dashboard />
    </PageLayout>
  );
}
