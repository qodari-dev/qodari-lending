'use client';
import { Fragment, ReactNode, useEffect } from 'react';
import { SidebarInset, SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { useHasPermission } from '@/stores/auth-store-provider';
import { usePathname, useRouter } from 'next/navigation';
import { ModeToggle } from '../mode-toggle';

// Tipo para los items del breadcrumb
interface BreadcrumbItemData {
  label: string;
  href?: string;
}

interface Props {
  children: ReactNode;
  breadcrumbs: BreadcrumbItemData[];
  permissionKey?: string;
}

export function PageLayout({ children, breadcrumbs, permissionKey }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const allowed = useHasPermission(permissionKey ?? '');

  // Extract accountSlug from pathname (e.g., /acme/admin/users -> acme)
  const accountSlug = pathname.split('/')[1];

  useEffect(() => {
    if (!allowed && permissionKey) {
      router.push(`/${accountSlug}/admin/401`);
    }
  }, [allowed, router, permissionKey, accountSlug]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => (
                <Fragment key={index}>
                  <BreadcrumbItem
                    className={index < breadcrumbs.length - 1 ? 'hidden md:block' : ''}
                  >
                    {item.href ? (
                      <BreadcrumbLink href={`/${accountSlug}${item.href}`}>
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div>
          <ModeToggle />
        </div>
      </header>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </SidebarInset>
  );
}
