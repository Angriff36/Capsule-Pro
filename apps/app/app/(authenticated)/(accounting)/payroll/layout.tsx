"use client";

import { cn } from "@repo/design-system/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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
    href: "/payroll/approvals",
    label: "Approvals",
  },
  {
    href: "/payroll/tax-setup",
    label: "Tax Setup",
  },
  {
    href: "/payroll/reports",
    label: "Reports",
  },
  {
    href: "/payroll/payouts",
    label: "Payouts",
  },
  {
    href: "/payroll/direct-deposit",
    label: "Direct Deposit",
  },
];

const PayrollLayout = ({ children }: PayrollLayoutProperties) => {
  const pathname = usePathname();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <nav className="flex gap-1 overflow-x-auto pb-1">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/payroll" && pathname?.startsWith(item.href));
          return (
            <Link
              className={cn(
                "inline-flex items-center whitespace-nowrap rounded-full px-4 py-1.5 font-medium text-sm transition-colors",
                isActive
                  ? "bg-ink text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
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

export default PayrollLayout;
