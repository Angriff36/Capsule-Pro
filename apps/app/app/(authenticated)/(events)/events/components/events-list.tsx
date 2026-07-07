"use client";

import { BlogFilterChip } from "@repo/design-system/components/blocks/blog-filter-chip";
import { ResearchTable } from "@repo/design-system/components/blocks/research-table";
import { Input } from "@repo/design-system/components/ui/input";
import Link from "next/link";
import { useMemo, useState } from "react";

interface EventListItem {
  completionPercent?: number;
  eventDate: string;
  eventNumber: string | null;
  eventType: string;
  guestCount: number;
  hasClient: boolean;
  id: string;
  status: string;
  tags: string[];
  title: string;
  venueName: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-blue-50 text-blue-700",
  tentative: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};

const TYPE_COLORS: Record<string, string> = {
  wedding: "bg-rose-50 text-rose-700",
  corporate: "bg-indigo-50 text-indigo-700",
  social: "bg-violet-50 text-violet-700",
  tasting: "bg-orange-50 text-orange-700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMono(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const STATUS_OPTIONS = [
  "all",
  "draft",
  "tentative",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
] as const;

const TYPE_OPTIONS = [
  "all",
  "wedding",
  "corporate",
  "social",
  "tasting",
] as const;

const DATE_OPTIONS = [
  "all",
  "this-week",
  "this-month",
  "upcoming",
  "past",
] as const;

const DATE_LABELS: Record<(typeof DATE_OPTIONS)[number], string> = {
  all: "All dates",
  past: "Past",
  "this-month": "This month",
  "this-week": "This week",
  upcoming: "Upcoming",
};

function isInRange(dateStr: string, window: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  switch (window) {
    case "this-week": {
      const end = new Date(now);
      end.setDate(end.getDate() + (7 - end.getDay()));
      return d >= now && d <= end;
    }
    case "this-month": {
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }
    case "upcoming":
      return d >= now;
    case "past":
      return d < now;
    default:
      return true;
  }
}

export function EventsList({ events }: { events: EventListItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && event.eventType !== typeFilter) {
        return false;
      }
      if (dateFilter !== "all" && !isInRange(event.eventDate, dateFilter)) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [
        event.title,
        event.eventNumber ?? "",
        event.venueName ?? "",
        event.eventType ?? "",
        event.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [events, search, statusFilter, typeFilter, dateFilter]);

  const rows = useMemo(
    () =>
      filtered.map((event) => {
        const isDraft = event.status === "draft";
        const completion =
          isDraft && typeof event.completionPercent === "number"
            ? event.completionPercent
            : null;
        return {
          id: event.id,
          title: (
            <div className="space-y-1">
              <div className="ds-body-large text-ink">{event.title}</div>
              {(event.venueName || event.guestCount > 0) && (
                <div className="ds-caption text-ink/50">
                  {[
                    event.venueName,
                    event.guestCount > 0
                      ? `${event.guestCount} guests`
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
            </div>
          ),
          href: `/events/${event.id}`,
          pills: (
            <>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${STATUS_COLORS[event.status] ?? "bg-slate-100 text-slate-600"}`}
              >
                {event.status}
              </span>
              {event.eventType && event.eventType !== "event" && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${TYPE_COLORS[event.eventType] ?? "bg-slate-50 text-slate-600"}`}
                >
                  {event.eventType}
                </span>
              )}
              {isDraft && completion !== null && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <span className="font-medium text-[11px] text-blue-700">
                    {completion}% complete
                  </span>
                  <Link
                    className="font-medium text-[11px] text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                    href={`/events/new?eventId=${event.id}`}
                  >
                    Resume setup →
                  </Link>
                </div>
              )}
            </>
          ),
          meta: (
            <div className="space-y-1 text-right">
              <div className="font-mono text-xs">
                {formatMono(event.eventDate)}
              </div>
              <div className="text-[11px] text-ink/50">
                {formatDate(event.eventDate)}
              </div>
            </div>
          ),
        };
      }),
    [filtered]
  );

  return (
    <section className="space-y-6">
      <Input
        className="sm:max-w-sm"
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search events, venue, type, tags..."
        value={search}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <BlogFilterChip
              key={s}
              onSelect={() => setStatusFilter(s)}
              selected={statusFilter === s}
            >
              {s === "all" ? "All" : s.replace("-", " ")}
            </BlogFilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => (
            <BlogFilterChip
              key={t}
              onSelect={() => setTypeFilter(t)}
              selected={typeFilter === t}
              tone="ghost"
            >
              {t === "all" ? "All types" : t}
            </BlogFilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_OPTIONS.map((d) => (
            <BlogFilterChip
              key={d}
              onSelect={() => setDateFilter(d)}
              selected={dateFilter === d}
              tone="ghost"
            >
              {DATE_LABELS[d]}
            </BlogFilterChip>
          ))}
        </div>
      </div>

      <ResearchTable
        caption={`${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
        linkComponent={({ href, className, children }) => (
          <Link className={className} href={href}>
            {children}
          </Link>
        )}
        rows={rows}
      />
    </section>
  );
}
