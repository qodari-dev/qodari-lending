'use client';

import {
  BookOpen,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { NavHeader } from '@/components/sidebar/nav-header';
import { NavMain } from '@/components/sidebar/nav-main';
import { NavUser } from '@/components/sidebar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuthUser, useHasPermission } from '@/stores/auth-store-provider';
import companyLogo from '../../../public/company-logo.png';

function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src={companyLogo}
      alt="Qodari IAM logo"
      className={cn('object-contain', className)}
      sizes="80px"
      priority
    />
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthUser();
  const pathname = usePathname();
  const canSeeDashboard = useHasPermission('dashboard:read');

  const data = React.useMemo(() => {
    return {
      user: {
        name: `${user?.firstName} ${user?.lastName}`,
        email: user?.email ?? '',
        avatar: `${user?.firstName[0]}${user?.lastName[0]}`,
      },
      app: {
        name: 'Creditos',
        Logo: AppLogo,
        url: `/`,
      },
      navMain: [
        {
          title: 'Principal',
          items: [
            ...(canSeeDashboard
              ? [
                  {
                    title: 'Dashboard',
                    url: `/dashboard`,
                    icon: LayoutDashboard,
                  },
                ]
              : []),
          ],
        },
        {
          title: 'Configuración',
          items: [
            {
              title: 'General',
              icon: Settings,
              isActive: pathname.startsWith(`/document-types`),
              items: [
                {
                  title: 'Settings',
                  url: `/settings`,
                },
                {
                  title: 'Tipos de documentos',
                  url: `/document-types`,
                },
                {
                  title: 'Razones de rechazo',
                  url: `/rejection-reasons`,
                },
                {
                  title: 'Formas de pago',
                  url: `/repayment-methods`,
                },
                {
                  title: 'Garantías de pago',
                  url: `/payment-guarantee-types`,
                },
                {
                  title: 'Periodicidad de pagos',
                  url: `/payment-frequencies`,
                },
                {
                  title: 'Tipos de inversión',
                  url: `/investment-types`,
                },
                {
                  title: 'Formas de pago (tesorería)',
                  url: `/payment-tender-types`,
                },
                {
                  title: 'Bancos',
                  url: `/banks`,
                },
              ],
            },
            {
              title: 'Contable',
              icon: BookOpen,
              isActive: pathname.startsWith(`/gl-accounts`),
              items: [
                {
                  title: 'Plan único de cuentas',
                  url: `/gl-accounts`,
                },
                {
                  title: 'Centros de costo',
                  url: `/cost-centers`,
                },
                {
                  title: 'Distribuciones contables',
                  url: `/accounting-distributions`,
                },
                {
                  title: 'Tipos de recibos de abonos',
                  url: `/payment-receipt-types`,
                },
                {
                  title: 'Usuarios para recibos de abonos',
                  url: `/user-payment-receipt-types`,
                },
              ],
            },
            {
              title: 'Créditos',
              icon: CreditCard,
              isActive: pathname.startsWith(`/credit-`),
              items: [
                {
                  title: 'Oficinas de afiliación',
                  url: `/affiliation-offices`,
                },
                {
                  title: 'Periodos contables',
                  url: `/accounting-periods`,
                },
                {
                  title: 'Fondos de créditos',
                  url: `/credit-funds`,
                },
                {
                  title: 'Usuarios oficina afiliación',
                  url: `/user-affiliation-offices`,
                },
                {
                  title: 'Tipos de créditos',
                  url: `/credit-products`,
                },
              ],
            },
            {
              title: 'Terceros',
              icon: Users,
              isActive: pathname.startsWith(`/third-`),
              items: [
                {
                  title: 'Tipos de terceros',
                  url: `/third-party-types`,
                },
                {
                  title: 'Terceros',
                  url: `/third-parties`,
                },
                {
                  title: 'Empresas de seguros',
                  url: `/insurance-companies`,
                },
              ],
            },
          ],
        },
        {
          title: 'Operaciones',
          items: [
            {
              title: 'Estudio de crédito',
              icon: ClipboardCheck,
              isActive: pathname.startsWith(`/simulation`) || pathname.startsWith(`/worker-study`),
              items: [
                {
                  title: 'Simulación de crédito',
                  url: `/simulation`,
                },
                {
                  title: 'Estudio Trabajador',
                  url: `/worker-study`,
                },
              ],
            },
          ],
        },
      ],
    };
  }, [user, pathname, canSeeDashboard]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavHeader {...data.app} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain menus={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
