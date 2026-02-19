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
                  { title: 'Abono por libranza', url: `/loan-payment-payroll` },
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
                title: 'Causacion',
                icon: ArrowLeftRight,
                items: [
                  { title: 'Interes corriente', url: `/causation-current-interest` },
                  { title: 'Seguro', url: `/causation-current-insurance` },
                  { title: 'Interes mora', url: `/causation-current-interest-late` },
                  { title: 'Otros conceptos', url: `/causation-billing-concepts` },
                  { title: 'Cierre de periodo', url: `/causation-period-closing` },
                ],
              },
              {
                title: 'Castiga Cartera',
                icon: ArrowLeftRight,
                items: [
                  {
                    title: 'Generar, revisar y ejecutar castiga cartera',
                    url: `/loan-write-off`,
                  },
                ],
              },
              {
                title: 'Interface Contable',
                icon: Receipt,
                items: [
                  { title: 'Creditos', url: `/interface-accounting` },
                  {
                    title: 'Interes Corriente',
                    url: `/interface-accounting/current-interest`,
                  },
                  { title: 'Interes Mora', url: `/interface-accounting/late-interest` },
                  { title: 'Abonos', url: `/interface-accounting/payments` },
                  { title: 'Castiga', url: `/interface-accounting/write-off` },
                  { title: 'Provicion', url: `/interface-accounting/provision` },
                ],
              },
              {
                title: 'Subsidio',
                icon: HandHeart,
                items: [
                  {
                    title: 'Genera comprobante de abonos de pignoracion',
                    url: `/subsidy/pledge-payment-voucher`,
                  },
                  {
                    title: 'Reporte de Pignoraciones realizadas',
                    url: `/subsidy/pledges-performed-report`,
                  },
                  {
                    title: 'Reporte Pignorados no realizadas',
                    url: `/subsidy/pledges-not-performed-report`,
                  },
                ],
              },
              {
                title: 'Archivos para bancos',
                icon: FileUp,
                items: [{ title: 'Generar archivo para banco', url: `/bank-files` }],
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
                items: [
                  {
                    title: 'Cartera de Creditos Actual',
                    url: `/portfolio-reports/current-credits`,
                  },
                  {
                    title: 'Historico de Cartera Por Periodo',
                    url: `/portfolio-reports/historical-period`,
                  },
                  {
                    title: 'Creditos para Cobro',
                    url: `/portfolio-reports/credits-for-collection`,
                  },
                  {
                    title: 'Cartera de libranza por Convenio',
                    url: `/portfolio-reports/payroll-by-agreement`,
                  },
                  {
                    title: 'Cartera por tipo de credito',
                    url: `/portfolio-reports/by-credit-type`,
                  },
                  {
                    title: 'Certificado de saldo del credito',
                    url: `/portfolio-reports/credit-balance-certificate`,
                  },
                  {
                    title: 'Certificado de saldo del tercero',
                    url: `/portfolio-reports/third-party-balance-certificate`,
                  },
                  {
                    title: 'Indicadores de Cartera',
                    url: `/portfolio-reports/portfolio-indicators`,
                  },
                ],
              },
              {
                title: 'Creditos',
                icon: BarChart3,
                items: [
                  { title: 'Extracto', url: `/credit-reports/extract` },
                  { title: 'Cuotas Pagadas', url: `/credit-reports/paid-installments` },
                  { title: 'Creditos Liquidados', url: `/credit-reports/liquidated-credits` },
                  {
                    title: 'Creditos No liquidados',
                    url: `/credit-reports/non-liquidated-credits`,
                  },
                  {
                    title: 'Creditos Anulados o rechazados',
                    url: `/credit-reports/cancelled-rejected-credits`,
                  },
                  { title: 'Acta', url: `/credit-reports/minutes` },
                  { title: 'Paz y Salvo de un Credito', url: `/credit-reports/credit-clearance` },
                  { title: 'Paz y Salvo de Tercero', url: `/credit-reports/third-party-clearance` },
                  { title: 'Comprobante de Movimientos', url: `/credit-reports/movement-voucher` },
                  { title: 'Creditos Saldados', url: `/credit-reports/settled-credits` },
                  {
                    title: 'Superintendencia de sociedades',
                    url: `/credit-reports/superintendencia`,
                  },
                ],
              },
              {
                title: 'Aseguradoras',
                icon: ShieldAlert,
                items: [{ title: 'Reporte para aseguradoras', url: `/insurance-reports` }],
              },
              {
                title: 'Centrales de riesgo',
                icon: ShieldAlert,
                items: [
                  { title: 'Cifin', url: `/risk-center-reports/cifin` },
                  { title: 'Datacredito', url: `/risk-center-reports/datacredito` },
                ],
              },
              {
                title: 'Oficios de Cobro',
                icon: ShieldAlert,
                items: [
                  { title: 'Cobro administrativo', url: `/collection-letters/administrative` },
                  { title: 'Cobro prejuridico', url: `/collection-letters/pre-legal` },
                ],
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
