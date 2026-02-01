import { PageLayout } from '@/components/sidebar/page-layout';

export default async function DashboardPage() {
  return (
    <PageLayout breadcrumbs={[{ label: 'Dashboard' }]} permissionKey="dashboard:read">
      &nbsp;
    </PageLayout>
  );
}
