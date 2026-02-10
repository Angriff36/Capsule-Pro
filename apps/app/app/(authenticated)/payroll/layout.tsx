"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@repo/design-system/lib/utils";

interface PayrollLayoutProperties {
  readonly children: ReactNode;
}

const navigationItems = [
  {
    href: "/payroll",
    label: "Overview",
  },
  {
    href: "/payroll/timecards",
    label: "Timecards",
  },
  {
    href: "/payroll/periods",
    label: "Periods",
  },
  {
    href: "/payroll/runs",
    label: "Payroll Runs",
  },
  {
    href: "/payroll/reports",
    label: "Reports",
  },
  {
    href: "/payroll/payouts",
    label: "Payouts",
  },
];

const PayrollLayout = ({ children }: PayrollLayoutProperties) => {
  const pathname = usePathname();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payroll</h2>
      </div>
      <nav className="flex space-x-1 border-b">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/payroll" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center px-1 py-4 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
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

export default PayrollLayout;
