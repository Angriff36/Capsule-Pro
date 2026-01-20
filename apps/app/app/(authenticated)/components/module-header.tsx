"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/design-system/lib/utils";
import { getModuleKeyFromPathname, modules } from "./module-nav";

export const ModuleHeader = () => {
  const pathname = usePathname();
  const activeModuleKey = getModuleKeyFromPathname(pathname);

  return (
    <div className="border-border border-b bg-background/95 px-6 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {modules.map((module) => {
          const isActive = module.key === activeModuleKey;

          return (
            <Link
              key={module.key}
              href={module.href}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium text-sm transition",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {module.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
