'use client';

import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileText,
  FileUp,
  HandCoins,
  HandHeart,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldAlert,
  Users,
  Wallet,
  LucideIcon,
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

// Helper to check if any subitem matches the current pathname
function isMenuActive(items: { url: string }[] | undefined, pathname: string): boolean {
  if (!items) return false;
  return items.some((item) => pathname.startsWith(item.url));
}

// Helper to add isActive to menu items automatically
function withAutoActive<T extends { items?: { url: string }[]; icon?: LucideIcon; title?: string }>(
  menuItems: T[],
  pathname: string
): (T & { isActive: boolean })[] {
  return menuItems.map((item) => ({
    ...item,
    isActive: isMenuActive(item.items, pathname),
  }));
}

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
          title: 'Configuracion',
          items: withAutoActive(
            [
              {
                title: 'General',
                icon: Settings,
                items: [
                  { title: 'Settings', url: `/credits-settings` },
                  { title: 'Tipos de identification', url: `/identification-types` },
                  { title: 'Ciudades', url: `/cities` },
                  { title: 'Tipos de documentos', url: `/document-types` },
                  { title: 'Motivos de rechazo', url: `/rejection-reasons` },
                  { title: 'Formas de pago', url: `/repayment-methods` },
                  { title: 'Garantías de pago', url: `/payment-guarantee-types` },
                  { title: 'Periodicidad de pagos', url: `/payment-frequencies` },
                  { title: 'Tipos de inversión', url: `/investment-types` },
                  { title: 'Medios de pago', url: `/payment-tender-types` },
                  { title: 'Bancos', url: `/banks` },
                  { title: 'Canales de creacion', url: `/channels` },
                  { title: 'Edades de cartera', url: `/aging-profiles` },
                ],
              },
              {
                title: 'Contable',
                icon: BookOpen,
                items: [
                  { title: 'Plan único de cuentas', url: `/gl-accounts` },
                  { title: 'Centros de costo', url: `/cost-centers` },
                  { title: 'Distribuciones contables', url: `/accounting-distributions` },
                  { title: 'Tipos de recibos de abonos', url: `/payment-receipt-types` },
                ],
              },
              {
                title: 'Créditos',
                icon: CreditCard,
                items: [
                  { title: 'Oficinas de afiliación', url: `/affiliation-offices` },
                  { title: 'Periodos contables', url: `/accounting-periods` },
                  { title: 'Fondos de créditos', url: `/credit-funds` },
                  { title: 'Conceptos de facturacion', url: `/billing-concepts` },
                  { title: 'Politicas de aplicacion', url: `/payment-allocation-policies` },
                  { title: 'Tipos de créditos', url: `/credit-products` },
                  { title: 'Convenios', url: `/agreements` },
                  { title: 'Perfiles de facturacion', url: `/billing-cycle-profiles` },
                ],
              },
              {
                title: 'Terceros',
                icon: Users,
                items: [
                  { title: 'Tipos de terceros', url: `/third-party-types` },
                  { title: 'Terceros', url: `/third-parties` },
                  { title: 'Empresas de seguros', url: `/insurance-companies` },
                ],
              },
            ],
            pathname
          ),
        },
        {
          title: 'Operaciones',
          items: withAutoActive(
            [
              {
                title: 'Estudio de crédito',
                icon: ClipboardCheck,
                items: [
                  { title: 'Simulación de crédito', url: `/credit-simulation` },
                  { title: 'Estudio Trabajador', url: `/worker-study` },
                ],
              },
              {
                title: 'Solicitudes y Creditos',
                icon: FileText,
                items: [
                  { title: 'Solicitud de crédito', url: `/loan-applications` },
                  { title: 'Creditos', url: `/loans` },
                  { title: 'Refinanciacion', url: `/loan-refinancing` },
                ],
              },
              {
                title: 'Abonos',
                icon: HandCoins,
                items: [
                  { title: 'Abono Individual', url: `/loan-payments` },
                  { title: 'Abono por libranza', url: `/loan-payments` },
                  { title: 'Abono por archivo', url: `/loan-payment-file` },
                ],
              },
            ],
            pathname
          ),
        },
        {
          title: 'Movimientos',
          items: withAutoActive(
            [
              {
                title: 'Creditos',
                icon: ArrowLeftRight,
                items: [{ title: 'Liquida credito', url: `/liquidation-credit` }],
              },
              {
                title: 'Contable',
                icon: Receipt,
                items: [{ title: 'Interface de contabilidad', url: `/interface-accounting` }],
              },
              {
                title: 'Subsidio',
                icon: HandHeart,
                items: [{ title: 'Pignoracion', url: `/pignoracion` }],
              },
              {
                title: 'Archivos para bancos',
                icon: FileUp,
                items: [{ title: 'Genera Archivo Banco', url: `/generate-bank-file` }],
              },
            ],
            pathname
          ),
        },
        {
          title: 'Reportes',
          items: withAutoActive(
            [
              {
                title: 'Cartera',
                icon: Wallet,
                items: [{ title: 'Edades de cartera', url: `/report-cartera/aging-profiles` }],
              },
              {
                title: 'Creditos',
                icon: BarChart3,
                items: [{ title: 'extracto', url: `/report-credits/extract` }],
              },
              {
                title: 'Centrales de riesgo',
                icon: ShieldAlert,
                items: [{ title: 'Centrales de riesgo', url: `/report-risk-centers/risk-centers` }],
              },
            ],
            pathname
          ),
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
