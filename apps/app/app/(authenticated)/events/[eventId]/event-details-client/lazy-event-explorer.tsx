"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  LayoutGridIcon,
  ListIcon,
} from "lucide-react";
import dynamic from "next/dynamic";

/**
 * Lazy-loaded EventExplorer with skeleton loader.
 *
 * This component is a secondary feature for browsing related events.
 * It includes filters, grid/timeline views, and event cards.
 * Lazy loading reduces initial bundle size significantly (~42KB).
 *
 * The skeleton matches the EventExplorer layout:
 * - Header with title, view toggle, and sort select
 * - Filters sidebar (desktop) + Quick filters
 * - Featured events grid, Today/This week cards, main event grid
 */
const EventExplorer = dynamic(
  () => import("./event-explorer").then((mod) => mod.EventExplorer),
  {
    loading: () => <EventExplorerSkeleton />,
    ssr: true,
  }
);

export { EventExplorer };

/**
 * Skeleton loader for EventExplorer.
 *
 * Displays skeleton elements matching the actual component layout
 * to prevent layout shift during lazy loading.
 */
function EventExplorerSkeleton() {
  return (
    <section className="space-y-6" id="explore">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="mb-1 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup className="rounded-full border border-border/70 bg-muted/40" type="single">
            <ToggleGroupItem className="gap-2" value="grid">
              <LayoutGridIcon className="size-4" />
              Grid
            </ToggleGroupItem>
            <ToggleGroupItem className="gap-2" value="calendar">
              <ListIcon className="size-4" />
              Timeline
            </ToggleGroupItem>
          </ToggleGroup>
          <Skeleton className="h-10 w-[160px] rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>

      {/* Main grid: filters sidebar + content */}
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Filters sidebar (desktop) */}
        <aside className="sticky top-6 hidden self-start lg:block">
          <Card className="border-border/60 bg-card/70 text-foreground">
            <div className="space-y-3 p-6">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-48" />
              <div className="space-y-4 pt-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </Card>
        </aside>

        {/* Main content area */}
        <div className="space-y-8">
          {/* Quick filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>

          {/* Featured events section */}
          <div className="rounded-3xl border border-border/60 bg-card/70 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <Skeleton className="h-5 w-32" />
              <Badge className="border-border/70 bg-muted/40 text-foreground" variant="outline">
                <Skeleton className="h-4 w-20" />
              </Badge>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Today/This week cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/60 bg-card/70 text-foreground">
              <div className="space-y-3 p-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-20 w-full" />
              </div>
            </Card>
            <Card className="border-border/60 bg-card/70 text-foreground">
              <div className="space-y-3 p-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-32 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                  <Skeleton className="h-7 w-36 rounded-full" />
                </div>
              </div>
            </Card>
          </div>

          {/* Main event grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
