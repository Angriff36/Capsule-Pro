"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { CalendarDaysIcon, MapPinIcon, TagIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { DeleteEventButton } from "./delete-event-button";

const statusVariantMap = {
  draft: "outline",
  confirmed: "default",
  tentative: "secondary",
  postponed: "outline",
  completed: "secondary",
  cancelled: "destructive",
} as const;

export type EventCardEvent = {
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

export function EventCard({ event }: { event: EventCardEvent }) {
  const date = new Date(event.eventDate);
  const displayTags = event.tags.filter((tag) => !tag.startsWith("needs:"));
  const variant =
    statusVariantMap[event.status as keyof typeof statusVariantMap] ?? "outline";

  return (
    <div className="group relative">
      <Link
        className="block"
        href={`/events/${event.id}`}
        key={event.id}
      >
        <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
          <CardHeader className="gap-1">
            <CardDescription className="flex items-center justify-between gap-2">
              <span className="truncate">
                {event.eventNumber ?? "Unassigned event number"}
              </span>
              <Badge className="capitalize" variant={variant}>
                {event.status}
              </Badge>
            </CardDescription>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <CardDescription className="capitalize">
              {event.eventType}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDaysIcon className="size-4" />
              <span>{date.toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UsersIcon className="size-4" />
              <span>{event.guestCount} guests</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPinIcon className="size-4" />
              <span className="line-clamp-1">
                {event.venueName ?? "Venue TBD"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TagIcon className="size-4" />
              <span className="line-clamp-1">
                {displayTags.length > 0 ? displayTags.join(", ") : "No tags"}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DeleteEventButton
          eventId={event.id}
          eventTitle={event.title}
          iconOnly
          size="icon"
          variant="secondary"
        />
      </div>
    </div>
  );
}
