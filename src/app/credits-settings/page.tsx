import { PageLayout } from '@/components/sidebar/page-layout';
import { CreditsSettingsPage } from './components/credits-settings-page';

export default async function CreditsSettingsRoute() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Configuración de Créditos' }]}
      permissionKey="credits-settings:read"
    >
      <CreditsSettingsPage />
    </PageLayout>
  );
}
