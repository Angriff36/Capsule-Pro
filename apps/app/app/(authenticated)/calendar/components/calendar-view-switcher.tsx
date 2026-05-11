"use client";

import { BlogFilterChip } from "@repo/design-system/components/blocks/blog-filter-chip";
import { ResearchTable } from "@repo/design-system/components/blocks/research-table";
import Link from "next/link";
import { useState } from "react";
import type { CalendarEvent } from "../page";
import { UnifiedCalendar } from "./unified-calendar";

const TYPE_COLORS: Record<string, string> = {
  event: "bg-[var(--ds-calendar-event-light)] text-blue-700",
  shift: "bg-[var(--ds-calendar-shift-light)] text-green-700",
  timeoff: "bg-[var(--ds-calendar-timeoff-light)] text-amber-700",
};

function formatMono(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDetailUrl(event: CalendarEvent): string {
  switch (event.type) {
    case "event":
      return `/events/${event.id}`;
    case "shift":
      return `/scheduling/shifts/${event.id}`;
    case "timeoff":
      return `/staff/time-off/${event.id}`;
    default:
      return "#";
  }
}

export function CalendarViewSwitcher({
  events,
  tenantId,
}: {
  events: CalendarEvent[];
  tenantId: string;
}) {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const listRows = [...events]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((event) => ({
      id: event.id,
      title: event.title,
      href: getDetailUrl(event),
      pills: (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[event.type] ?? "bg-muted text-muted-foreground"}`}
        >
          {event.type === "timeoff" ? "Time off" : event.type}
        </span>
      ),
      meta: (
        <span className="font-mono text-xs">{formatMono(event.start)}</span>
      ),
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <BlogFilterChip
          onSelect={() => setView("calendar")}
          selected={view === "calendar"}
        >
          Calendar
        </BlogFilterChip>
        <BlogFilterChip
          onSelect={() => setView("list")}
          selected={view === "list"}
        >
          List
        </BlogFilterChip>
      </div>

      {view === "calendar" ? (
        <div className="rounded-[22px] border border-hairline bg-canvas p-4 sm:p-6">
          <UnifiedCalendar initialEvents={events} tenantId={tenantId} />
        </div>
      ) : (
        <ResearchTable
          caption={`${events.length} calendar ${events.length === 1 ? "entry" : "entries"}`}
          linkComponent={({ href, className, children }) => (
            <Link className={className} href={href}>
              {children}
            </Link>
          )}
          rows={listRows}
        />
      )}
    </div>
  );
}
