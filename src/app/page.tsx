import { PageLayout } from '@/components/sidebar/page-layout';

export default async function HomePage() {
  return <PageLayout breadcrumbs={[{ label: 'Home' }]}>&nbsp;</PageLayout>;
}
