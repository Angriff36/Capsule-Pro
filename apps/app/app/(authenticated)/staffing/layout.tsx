"use client";

import { cn } from "@repo/design-system/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface StaffingLayoutProperties {
  readonly children: ReactNode;
}

const navigationItems = [
  { href: "/staffing", label: "Overview" },
  { href: "/staffing/shifts", label: "Shifts" },
  { href: "/staffing/availability", label: "Availability" },
  { href: "/staffing/coverage", label: "Coverage" },
  { href: "/staffing/recommendations", label: "AI Recommendations" },
];

const StaffingLayout = ({ children }: StaffingLayoutProperties) => {
  const pathname = usePathname();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Staffing</h2>
      </div>
      <nav className="flex space-x-1 border-b overflow-x-auto">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/staffing" && pathname?.startsWith(item.href));
          return (
            <Link
              className={cn(
                "inline-flex items-center px-1 py-4 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
};

export default StaffingLayout;
