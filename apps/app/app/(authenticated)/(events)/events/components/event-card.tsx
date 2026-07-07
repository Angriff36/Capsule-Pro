"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Separator } from "@repo/design-system/components/ui/separator";
import { CalendarDaysIcon, MapPinIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { parseISODateToLocal } from "../../../../lib/format";
import { DeleteEventButton } from "./delete-event-button";

const statusVariantMap = {
  draft: "outline",
  confirmed: "default",
  tentative: "secondary",
  postponed: "outline",
  completed: "secondary",
  cancelled: "destructive",
} as const;

export interface EventCardEvent {
  eventDate: string;
  eventNumber: string | null;
  eventType: string;
  guestCount: number;
  hasClient: boolean;
  hasContract: boolean;
  hasMenu: boolean;
  hasPrepList: boolean;
  id: string;
  status: string;
  tags: string[];
  title: string;
  venueName: string | null;
}

export function EventCard({ event }: { event: EventCardEvent }) {
  // Parse ISO date string to local Date to avoid timezone shifts
  const date = parseISODateToLocal(event.eventDate);
  const displayTags = event.tags.filter((tag) => !tag.startsWith("needs:"));
  const variant =
    statusVariantMap[event.status as keyof typeof statusVariantMap] ??
    "outline";

  // Calculate setup progress
  const setupProgress = [
    event.hasClient,
    !!event.venueName,
    event.hasMenu,
    event.hasPrepList,
  ].filter(Boolean).length;
  const progressPercent = (setupProgress / 4) * 100;

  return (
    <Link className="block" href={`/events/${event.id}`}>
      <Card className="h-full transition hover:border-primary/40" tone="canvas">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {event.eventNumber ?? "Unassigned"}
                </span>
                <span className="text-muted-foreground/40">•</span>
                <CardDescription className="text-muted-foreground capitalize">
                  {event.eventType}
                </CardDescription>
              </div>
              <CardTitle className="line-clamp-2 leading-tight">
                {event.title}
              </CardTitle>
            </div>
            <CardAction>
              <Badge className="capitalize" variant={variant}>
                {event.status}
              </Badge>
            </CardAction>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-3 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDaysIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UsersIcon className="size-3.5 shrink-0" />
              <span className="truncate">{event.guestCount} guests</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="line-clamp-1">
              {event.venueName ?? "No venue assigned"}
            </span>
          </div>
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {displayTags.slice(0, 3).map((tag) => (
                <span
                  className="inline-flex items-center rounded-md bg-muted/50 px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
              {displayTags.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-muted/50 px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground">
                  +{displayTags.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="mt-2 border-border border-t pt-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Progress className="h-1.5 flex-1" value={progressPercent} />
              <span>{setupProgress}/4</span>
            </div>
          </div>
        </CardContent>

        <CardAction>
          <DeleteEventButton
            eventId={event.id}
            eventTitle={event.title}
            iconOnly
            size="icon"
            variant="ghost"
          />
        </CardAction>
      </Card>
    </Link>
  );
}
