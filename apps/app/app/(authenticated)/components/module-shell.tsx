"use client";

import { cn } from "@repo/design-system/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ModuleNavItem = {
  title: string;
  href: string;
};

type ModuleShellProperties = {
  title: string;
  navItems: ModuleNavItem[];
  children: ReactNode;
};

export const ModuleShell = ({
  title,
  navItems,
  children,
}: ModuleShellProperties) => {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-6rem)] gap-6 px-6 py-6">
      <aside className="hidden w-64 shrink-0 rounded-2xl border border-border/60 bg-muted/30 p-4 md:block">
        <div className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-accent/60 text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                href={item.href}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};
