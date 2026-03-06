"use client";

import { useMemo, useState } from "react";
import { Input } from "@repo/design-system/components/ui/input";
import { EventCard } from "./event-card";

type EventListItem = {
  id: string;
  title: string;
  eventNumber: string | null;
  status: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  venueName: string | null;
  tags: string[];
};

export function EventsList({ events }: { events: EventListItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const statuses = useMemo(() => {
    const set = new Set(events.map((event) => event.status).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [events]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (status !== "all" && event.status !== status) return false;
      if (!query) return true;

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
  }, [events, search, status]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search events, venue, type, tags..."
          className="sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value === "all" ? "All statuses" : value}
            </option>
          ))}
        </select>
      </div>

      <h2 className="text-sm font-medium text-muted-foreground">
        Events ({filtered.length})
      </h2>
      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
