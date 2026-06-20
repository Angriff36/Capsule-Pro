"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { generateBreadcrumbTrail } from "./breadcrumb-trail";

/**
 * Persistent breadcrumb bar rendered inside `SidebarInset` (below the
 * `ModuleHeader`). It tracks the full entity chain for the current URL across
 * every module and lets the user click any ancestor to jump back.
 *
 * A "parent context" chip on the left surfaces which module/entity the current
 * sub-entity belongs to — critical when multiple browser tabs are open on
 * different events and users navigate 4–5 levels deep.
 *
 * The bar only renders when there is a meaningful trail (depth > 1), so module
 * roots and top-level landing pages stay uncluttered.
 */
export const BreadcrumbBar = () => {
  const pathname = usePathname() ?? "";

  const { items, context } = generateBreadcrumbTrail(pathname);

  // Nothing deeper than the module root — no bar needed (ModuleHeader covers it).
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-hairline border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1 md:hidden" />

      {/*
       * Parent context chip: shows the owning module so users always know which
       * area the current sub-entity belongs to (e.g. which event a prep task
       * is under when several tabs are open).
       */}
      {context && (
        <Badge
          asChild
          className="shrink-0 bg-muted font-medium text-muted-foreground"
          variant="secondary"
        >
          <Link href={context.href}>{context.label}</Link>
        </Badge>
      )}

      <Separator className="mx-1 h-4" orientation="vertical" />

      <Breadcrumb>
        <BreadcrumbList className="text-muted-foreground/70 text-sm">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const key = `${item.label}-${item.href ?? "current"}`;

            return (
              <Fragment key={key}>
                {index > 0 && (
                  <BreadcrumbSeparator className="[&>svg]:size-3.5" />
                )}
                <BreadcrumbItem className="min-w-0">
                  {isLast || !item.href ? (
                    <BreadcrumbPage className="truncate font-normal text-foreground">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      asChild
                      className="transition-colors hover:text-foreground"
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
