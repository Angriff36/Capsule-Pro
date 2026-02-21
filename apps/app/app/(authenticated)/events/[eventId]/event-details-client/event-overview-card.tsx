"use client";

import type { Event } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { cn } from "@repo/design-system/lib/utils";
import {
  ActivityIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  KanbanIcon,
  Link as LinkIcon,
  MapPinIcon,
  PartyPopperIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddToBoardDialog } from "../../../command-board/components/add-to-board-dialog";
import { EventBriefingCard } from "../../components/event-briefing-card";
import type { PrepTaskSummaryClient } from "../prep-task-contract";
import { buildCalendarUrl, formatEventFormat } from "./utils";

const statusVariantMap = {
  draft: "outline",
  confirmed: "default",
  tentative: "secondary",
  postponed: "outline",
  completed: "secondary",
  cancelled: "destructive",
} as const;

interface EventOverviewCardProps {
  event: Omit<Event, "budget" | "ticketPrice"> & {
    budget: number | null;
    ticketPrice: number | null;
  };
  rsvpCount: number;
  prepTasks: PrepTaskSummaryClient[];
  aggregatedIngredientsCount: number;
  inventoryStats: {
    tracked: number;
    low: number;
  };
  taskSummary: {
    pending: number;
    in_progress: number;
    completed: number;
    canceled: number;
    other: number;
  };
  isLive: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  isSoldOut: boolean;
  isLimited: boolean;
  availability: number;
  capacity: number;
  eventStatusLabel: string;
  timeStatusLabel: string;
  ticketPriceLabel: string;
  timeZoneLabel: string;
  eventDate: Date;
  eventStart: Date;
  now: Date;
  isSaved: boolean;
  saveReady: boolean;
  featuredMediaUrl: string | null;
  displayedTags: string[];
  // Handlers
  onQuickRsvp: () => void;
  onToggleSave: () => void;
  onShare: () => void;
  onInviteTeam: () => void;
  onEditEvent: () => void;
  onUpdateDetails: () => void;
  missingFields: string[];
}

export function EventOverviewCard({
  event,
  rsvpCount,
  prepTasks,
  aggregatedIngredientsCount,
  inventoryStats,
  taskSummary,
  isLive,
  isPast,
  isUpcoming,
  isSoldOut,
  isLimited,
  availability,
  capacity,
  eventStatusLabel,
  timeStatusLabel,
  ticketPriceLabel,
  timeZoneLabel,
  eventDate,
  now,
  isSaved,
  saveReady,
  featuredMediaUrl,
  displayedTags,
  onQuickRsvp,
  onToggleSave,
  onShare,
  onInviteTeam,
  onEditEvent,
  onUpdateDetails,
  missingFields,
}: EventOverviewCardProps) {
  const eventStatusVariant =
    statusVariantMap[event.status as keyof typeof statusVariantMap] ??
    "outline";

  const showMissingFieldsBanner = missingFields.length > 0;

  return (
    <>
      {showMissingFieldsBanner && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 size-4 text-amber-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <div className="font-semibold text-sm">
                  Event needs more details
                </div>
                <div className="text-xs text-amber-800">
                  Missing:{" "}
                  {missingFields
                    .map((f) => {
                      const labels: Record<string, string> = {
                        client: "Event title",
                        eventDate: "Event date",
                        venueName: "Venue",
                        eventType: "Event type",
                        headcount: "Guest count",
                        menuItems: "Menu items",
                      };
                      return labels[f] ?? f;
                    })
                    .join(", ")}
                </div>
              </div>
            </div>
            <Button onClick={onUpdateDetails} size="sm" variant="outline">
              Update details
            </Button>
          </div>
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Event Overview
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="border-border/60 bg-card/70 text-foreground shadow-xl">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Badge
                  className={cn(
                    "border text-[11px]",
                    isLive
                      ? "border-success/40 bg-success/20 text-success"
                      : isPast
                        ? "border-slate-500/40 bg-slate-500/10 text-foreground"
                        : "border-info/40 bg-info/10 text-info"
                  )}
                  variant="outline"
                >
                  {eventStatusLabel}
                </Badge>
                {isSoldOut && (
                  <Badge
                    className="border-destructive/40 bg-destructive/20 text-destructive"
                    variant="outline"
                  >
                    Sold out
                  </Badge>
                )}
                {!isSoldOut && isLimited && (
                  <Badge
                    className="border-warning/40 bg-warning/20 text-warning"
                    variant="outline"
                  >
                    Limited
                  </Badge>
                )}
                <Badge className="capitalize" variant={eventStatusVariant}>
                  {event.status}
                </Badge>
                {event.eventFormat && (
                  <Badge
                    className="border-border/60 bg-muted/30 text-foreground"
                    variant="outline"
                  >
                    {formatEventFormat(event.eventFormat)}
                  </Badge>
                )}
                {event.ticketTier && (
                  <Badge
                    className="border-border/60 bg-muted/30 text-foreground"
                    variant="outline"
                  >
                    {event.ticketTier}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  {event.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {event.eventType}{" "}
                  <span className="text-muted-foreground">•</span>{" "}
                  {event.venueName ?? "Venue TBD"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {displayedTags.length > 0 ? (
                  displayedTags.map((tag) => (
                    <Badge
                      className="border-border/70 bg-muted/40 text-foreground"
                      key={tag}
                      variant="outline"
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No tags yet
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <CalendarDaysIcon className="size-3" />
                    Date & Time
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(eventDate)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Time not set • {timeZoneLabel}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {timeStatusLabel}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <MapPinIcon className="size-3" />
                    Organizer / Venue
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    {event.venueName ?? "Organizer not set"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.venueAddress ?? "Venue address not set"}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-1 text-[11px] text-success">
                    <ShieldCheckIcon className="size-3" />
                    Verified venue
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <WalletIcon className="size-3" />
                    Pricing & Format
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {ticketPriceLabel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.ticketTier ?? "Ticket tier not set"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatEventFormat(event.eventFormat)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <UsersIcon className="size-3" />
                    Capacity & RSVPs
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {rsvpCount} RSVPs
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {capacity > 0
                      ? `${capacity} total capacity`
                      : "Capacity not set"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isSoldOut
                      ? "Sold out"
                      : isLimited
                        ? "Limited seats"
                        : capacity > 0
                          ? `${Math.max(availability, 0)} seats available`
                          : "Availability not set"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="bg-success text-success-foreground hover:bg-success/90"
                  disabled={isSoldOut}
                  onClick={onQuickRsvp}
                >
                  <PartyPopperIcon className="mr-2 size-4" />
                  {isSoldOut ? "Sold out" : "RSVP / Join"}
                </Button>
                <Button
                  disabled={!saveReady}
                  onClick={onToggleSave}
                  variant="outline"
                >
                  <svg
                    className={cn("mr-2 size-4", isSaved && "fill-current")}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {isSaved ? "Saved" : "Save"}
                </Button>
                <Button onClick={onShare} variant="outline">
                  <LinkIcon className="mr-2 size-4" />
                  Share
                </Button>
                <AddToBoardDialog
                  defaultBoardDescription={event.notes ?? undefined}
                  defaultBoardName={`Event: ${event.title}`}
                  entityId={event.id}
                  entityType="event"
                  trigger={
                    <Button variant="outline">
                      <KanbanIcon className="mr-2 size-4" />
                      Add to Board
                    </Button>
                  }
                />
                <Button asChild variant="ghost">
                  <a
                    href={buildCalendarUrl(
                      event.title,
                      eventDate,
                      event.eventType,
                      event.venueName,
                      event.venueAddress,
                      event.notes
                    )}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <CalendarPlusIcon className="mr-2 size-4" />
                    Add to calendar
                  </a>
                </Button>
                <Button onClick={onInviteTeam} variant="ghost">
                  <UsersIcon className="mr-2 size-4" />
                  Invite team
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/crm/venues">
                    <MapPinIcon className="mr-2 size-4" />
                    View organizer
                  </Link>
                </Button>
                <Button onClick={onEditEvent} variant="ghost">
                  <SparklesIcon className="mr-2 size-4" />
                  Edit details
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="relative h-72 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-muted to-card">
              {featuredMediaUrl ? (
                <Image
                  alt={event.title}
                  className="object-cover"
                  fill
                  src={featuredMediaUrl}
                />
              ) : (
                <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <SparklesIcon className="size-10 text-foreground/60" />
                  <p className="text-sm">Featured media not set</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-muted/80 via-muted/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Featured media
                </p>
                <p className="mt-1 text-lg font-semibold">{event.eventType}</p>
                <p className="text-xs text-muted-foreground">
                  {event.venueName ?? "Venue TBD"} •{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(eventDate)}
                </p>
              </div>
            </div>

            <Card className="border-border/60 bg-card/70 text-foreground">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ActivityIcon className="size-5 text-success" />
                  Operations snapshot
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Live readiness across guests, tasks, and inventory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>RSVP progress</span>
                    <span>
                      {capacity > 0
                        ? `${rsvpCount}/${capacity}`
                        : `${rsvpCount} RSVPs`}
                    </span>
                  </div>
                  <Progress
                    className="mt-2"
                    value={
                      capacity > 0
                        ? Math.min((rsvpCount / capacity) * 100, 100)
                        : 0
                    }
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {isSoldOut
                      ? "Guest list is full"
                      : isLimited
                        ? "Seats are nearly full"
                        : "Guest list still open"}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Prep tasks
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {prepTasks.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {taskSummary.pending} pending • {taskSummary.in_progress}{" "}
                      in progress • {taskSummary.completed} done
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Inventory coverage
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {inventoryStats.tracked}/{aggregatedIngredientsCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {inventoryStats.low > 0
                        ? `${inventoryStats.low} low stock alerts`
                        : "All items tracked"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="#guests">Guest list</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="#recipes">Menu intelligence</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="#explore">Explore events</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <EventBriefingCard eventId={event.id} eventTitle={event.title} />
          </div>
        </div>
      </section>
    </>
  );
}
