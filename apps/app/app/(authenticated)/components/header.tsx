import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/design-system/components/ui/breadcrumb";
import { Separator } from "@repo/design-system/components/ui/separator";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { Fragment, type ReactNode } from "react";

interface HeaderBreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  pages: string[] | HeaderBreadcrumbItem[];
  page: string;
  children?: ReactNode;
}

function isBreadcrumbItem(
  item: string | HeaderBreadcrumbItem
): item is HeaderBreadcrumbItem {
  return typeof item === "object" && "label" in item;
}

export const Header = ({ pages, page, children }: HeaderProps) => {
  const breadcrumbItems: HeaderBreadcrumbItem[] = pages.map((item) =>
    isBreadcrumbItem(item) ? item : { label: item, href: undefined }
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator className="mr-2 h-4" orientation="vertical" />
        <Breadcrumb>
          <BreadcrumbList className="text-muted-foreground/70 text-sm">
            {breadcrumbItems.map((item, index) => (
              <Fragment key={item.label}>
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden md:block" />
                )}
                <BreadcrumbItem className="hidden md:block">
                  {item.href ? (
                    <BreadcrumbLink href={item.href}>
                      {item.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbLink href="#">{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{page}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {children}
    </header>
  );
};
