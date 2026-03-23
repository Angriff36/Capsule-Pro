"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
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
  if (!value) {
    return DEFAULT_TAB;
  }

  return TAB_VALUES.includes(value as EventDetailTabValue)
    ? (value as EventDetailTabValue)
    : DEFAULT_TAB;
}

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

  // Derive active tab directly from URL - single source of truth
  const activeTab = useMemo(
    () => normalizeTab(searchParams?.get("tab") ?? null),
    [searchParams]
  );

  const handleTabChange = (value: string) => {
    if (!pathname) {
      return;
    }

    const nextTab = normalizeTab(value);

    // Skip if same tab
    if (nextTab === activeTab) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? "");
    if (nextTab === DEFAULT_TAB) {
      nextSearchParams.delete("tab");
    } else {
      nextSearchParams.set("tab", nextTab);
    }

    const query = nextSearchParams.toString();
    // Use startTransition to avoid blocking UI during navigation
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  return (
    <Tabs className="w-full" onValueChange={handleTabChange} value={activeTab}>
      <div className="md:sticky md:top-4 md:z-20 md:pb-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto min-w-full gap-1 rounded-xl border border-border/70 bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <TabsTrigger className="shrink-0" value="overview">
              Overview
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="menu">
              Menu
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="copilot">
              Copilot
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="guests">
              Guests
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="operations">
              Operations
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="followups">
              Follow-Ups
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="explore">
              Explore
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent className="space-y-4" value="overview">
        {overview}
      </TabsContent>

      <TabsContent className="space-y-4" value="menu">
        {menu}
      </TabsContent>

      <TabsContent className="space-y-4" value="copilot">
        {copilot}
      </TabsContent>

      <TabsContent className="space-y-4" value="guests">
        {guests}
      </TabsContent>

      <TabsContent className="space-y-4" value="operations">
        {operations}
      </TabsContent>

      <TabsContent className="space-y-4" value="followups">
        {followups}
      </TabsContent>

      <TabsContent className="space-y-4" value="explore">
        {explore}
      </TabsContent>
    </Tabs>
  );
}
