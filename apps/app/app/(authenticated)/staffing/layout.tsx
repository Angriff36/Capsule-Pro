"use client";

import {
  DisplayHeading,
  MonoLabel,
} from "@repo/design-system/components/blocks/page-shell";
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
    <div className="flex flex-1 flex-col">
      {/* Header Band */}
      <div className="bg-deep-green px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <MonoLabel tone="dark">Staffing</MonoLabel>
          <DisplayHeading className="mt-2">Staffing</DisplayHeading>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Manage shifts, availability, and AI-powered coverage
            recommendations.
          </p>
        </div>
      </div>

      {/* Pill Navigation */}
      <div className="bg-canvas px-6">
        <div className="mx-auto max-w-7xl">
          <nav className="flex gap-1 overflow-x-auto py-3">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/staffing" && pathname?.startsWith(item.href));
              return (
                <Link
                  className={cn(
                    "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
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
        </div>
      </div>

      <div className="flex-1 p-6">{children}</div>
    </div>
  );
};

export default StaffingLayout;
