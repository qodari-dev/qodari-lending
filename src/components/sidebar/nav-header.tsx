'use client';

import * as React from 'react';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import Link from 'next/link';

export function NavHeader({
  name,
  Logo,
  url,
}: {
  name: string;
  Logo: React.ElementType;
  url: string;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Link href={url} className="flex items-center gap-2">
            <div className="text-sidebar-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg">
              <Logo className="size-10" />
            </div>
            <div className="text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
