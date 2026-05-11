"use client";

import { cn } from "@repo/design-system/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { startTransition, useMemo } from "react";

const TAB_VALUES = [
  "overview",
  "menu",
  "copilot",
  "guests",
  "operations",
  "followups",
  "explore",
] as const;

type EventDetailTabValue = (typeof TAB_VALUES)[number];

interface EventDetailTabsProps {
  overview: ReactNode;
  menu: ReactNode;
  copilot: ReactNode;
  guests: ReactNode;
  operations: ReactNode;
  followups: ReactNode;
  explore: ReactNode;
}

const DEFAULT_TAB: EventDetailTabValue = "overview";

function normalizeTab(value: string | null): EventDetailTabValue {
  if (!value) return DEFAULT_TAB;
  return TAB_VALUES.includes(value as EventDetailTabValue)
    ? (value as EventDetailTabValue)
    : DEFAULT_TAB;
}

const TAB_LABELS: Record<EventDetailTabValue, string> = {
  overview: "Overview",
  menu: "Menu",
  copilot: "Copilot",
  guests: "Guests",
  operations: "Operations",
  followups: "Follow-Ups",
  explore: "Explore",
};

export function EventDetailTabs({
  overview,
  menu,
  copilot,
  guests,
  operations,
  followups,
  explore,
}: EventDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(
    () => normalizeTab(searchParams?.get("tab") ?? null),
    [searchParams]
  );

  const handleTabChange = (tab: EventDetailTabValue) => {
    if (!pathname || tab === activeTab) return;
    const nextSearchParams = new URLSearchParams(
      searchParams?.toString() ?? ""
    );
    if (tab === DEFAULT_TAB) {
      nextSearchParams.delete("tab");
    } else {
      nextSearchParams.set("tab", tab);
    }
    const query = nextSearchParams.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  const tabContent: Record<EventDetailTabValue, ReactNode> = {
    overview,
    menu,
    copilot,
    guests,
    operations,
    followups,
    explore,
  };

  return (
    <div className="w-full">
      <div className="md:sticky md:top-4 md:z-20 md:pb-4">
        <div className="overflow-x-auto">
          <div
            className="inline-flex h-auto min-w-full gap-1 rounded-xl border border-border/70 bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/70"
            role="tablist"
          >
            {TAB_VALUES.map((tab) => (
              <button
                className={cn(
                  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={tab}
                onClick={() => handleTabChange(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                type="button"
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Render only the active tab content — avoids Radix internal state conflicts */}
      <div className="space-y-4 pt-2">{tabContent[activeTab]}</div>
    </div>
  );
}
