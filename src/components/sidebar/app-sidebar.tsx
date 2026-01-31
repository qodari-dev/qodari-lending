'use client';

import { Download, Users } from 'lucide-react';
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

  // Extract accountSlug from pathname (e.g., /acme/admin/users -> acme)

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
        url: `/admin`,
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
                    icon: Users,
                  },
                ]
              : []),
          ],
        },
        {
          title: 'Configuracion',
          items: [
            {
              title: 'Reports',
              icon: Download,
              isActive: pathname.startsWith(`/reports`),
              items: [
                {
                  title: 'Permisos por aplicación',
                  url: `/reports/permissions-by-application`,
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
