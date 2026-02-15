"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@repo/design-system/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { GridBackground } from "@repo/design-system/components/ui/grid-background";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import { cn } from "@repo/design-system/lib/utils";
import {
  Activity,
  CalendarDays,
  CalendarPlus,
  ClipboardCopy,
  Clock,
  Filter,
  Flame,
  LayoutGrid,
  List,
  MapPin,
  Tag,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { eventStatuses } from "../constants";
import type { KitchenEvent } from "./types";

type ViewMode = "timeline" | "queue";
type QuickFilter = "live-now" | "starting-soon" | "high-capacity" | "sold-out";
type OperationalStatus = "upcoming" | "live" | "finished";

const statusVariantMap = {
  draft: "outline",
  confirmed: "default",
  tentative: "secondary",
  postponed: "outline",
  completed: "secondary",
  cancelled: "destructive",
} as const;

const operationalStatusConfig: Record<
  OperationalStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-slate-950 text-white dark:bg-slate-50 dark:text-slate-900",
  },
  live: {
    label: "Live",
    className:
      "bg-emerald-500/90 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)]",
  },
  finished: {
    label: "Finished",
    className: "bg-muted text-foreground",
  },
};

const soldOutTagMatches = ["sold out", "sold-out", "soldout"];
const limitedTagMatches = ["limited", "low-capacity", "capacity:limited"];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const calendarDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

const formatCalendarDate = (date: Date): string =>
  calendarDateFormatter.format(date).replace(/-/g, "");

const startOfDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

const endOfDay = (date: Date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

const parseDateInput = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

interface FiltersPanelProps {
  className?: string;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  selectedVenue: string;
  setSelectedVenue: (value: string) => void;
  venueOptions: { venues: string[]; hasUnassigned: boolean };
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  eventStatuses: readonly string[];
  selectedTags: string[];
  tagOptions: string[];
  onToggleTag: (tag: string) => void;
  filteredCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

function FiltersPanel({
  className,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedVenue,
  setSelectedVenue,
  venueOptions,
  selectedStatus,
  setSelectedStatus,
  eventStatuses,
  selectedTags,
  tagOptions,
  onToggleTag,
  filteredCount,
  hasActiveFilters,
  onResetFilters,
}: FiltersPanelProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-2">
        <Label htmlFor="filter-start-date">Start date</Label>
        <Input
          id="filter-start-date"
          onChange={(event) => setStartDate(event.target.value)}
          type="date"
          value={startDate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-end-date">End date</Label>
        <Input
          id="filter-end-date"
          onChange={(event) => setEndDate(event.target.value)}
          type="date"
          value={endDate}
        />
      </div>
      <div className="space-y-2">
        <Label>Venue / location</Label>
        <Select onValueChange={setSelectedVenue} value={selectedVenue}>
          <SelectTrigger>
            <SelectValue placeholder="All venues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All venues</SelectItem>
            {venueOptions.venues.map((venue) => (
              <SelectItem key={venue} value={venue}>
                {venue}
              </SelectItem>
            ))}
            {venueOptions.hasUnassigned && (
              <SelectItem value="unassigned">Unassigned venue</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select onValueChange={setSelectedStatus} value={selectedStatus}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {eventStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button className="w-full justify-between" variant="outline">
              {selectedTags.length > 0
                ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
                : "Choose tags"}
              <Tag className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            {tagOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tags available yet.
              </p>
            ) : (
              <div className="space-y-2">
                {tagOptions.map((tag) => (
                  <label className="flex items-center gap-2 text-sm" key={tag}>
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => onToggleTag(tag)}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filteredCount} events matched
        </span>
        <Button
          disabled={!hasActiveFilters}
          onClick={onResetFilters}
          size="sm"
          variant="ghost"
        >
          Reset filters
        </Button>
      </div>
    </div>
  );
}

export const KitchenDashboardClient = ({
  events,
  initialNow,
}: {
  events: KitchenEvent[];
  initialNow: string;
}) => {
  const [now, setNow] = useState(() => new Date(initialNow));
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilter[]>(
    []
  );
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const parsedEvents = useMemo(() => {
    return events.map((event) => {
      const eventDate = new Date(event.eventDate);
      const createdAt = new Date(event.createdAt);
      const displayTags = event.tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0 && !tag.startsWith("needs:"));
      const normalizedTags = displayTags.map((tag) => tag.toLowerCase());
      const soldOut = normalizedTags.some((tag) =>
        soldOutTagMatches.includes(tag)
      );
      const limited = normalizedTags.some((tag) =>
        limitedTagMatches.includes(tag)
      );

      return {
        ...event,
        eventDate,
        createdAt,
        displayTags,
        soldOut,
        limited,
      };
    });
  }, [events]);

  const highCapacityThreshold = useMemo(() => {
    const counts = parsedEvents
      .map((event) => event.guestCount)
      .filter((count) => count > 0)
      .sort((a, b) => a - b);

    if (counts.length === 0) {
      return 0;
    }

    const index = Math.floor(0.75 * (counts.length - 1));
    return counts[Math.max(0, index)];
  }, [parsedEvents]);

  const enrichedEvents = useMemo(() => {
    return parsedEvents.map((event) => {
      // Event dates are date-only in the schema, so operational timing uses day boundaries.
      const start = startOfDay(event.eventDate);
      const end = endOfDay(event.eventDate);
      const isLive = now >= start && now <= end;
      const isFinished =
        now > end || ["completed", "cancelled"].includes(event.status);
      const isUpcoming = !isFinished && now < start;
      const operationalStatus: OperationalStatus = isLive
        ? "live"
        : isFinished
          ? "finished"
          : "upcoming";
      const isStartingSoon = start > now && start <= addHours(now, 24);
      const isHighCapacity =
        highCapacityThreshold > 0 && event.guestCount >= highCapacityThreshold;

      return {
        ...event,
        start,
        end,
        isLive,
        isFinished,
        isUpcoming,
        isStartingSoon,
        isHighCapacity,
        operationalStatus,
      };
    });
  }, [parsedEvents, now, highCapacityThreshold]);

  const venueOptions = useMemo(() => {
    const venues = new Set<string>();
    let hasUnassigned = false;

    for (const event of parsedEvents) {
      if (event.venueName?.trim()) {
        venues.add(event.venueName.trim());
      } else {
        hasUnassigned = true;
      }
    }

    return {
      venues: Array.from(venues).sort(),
      hasUnassigned,
    };
  }, [parsedEvents]);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const event of parsedEvents) {
      for (const tag of event.displayTags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [parsedEvents]);

  const filterStart = parseDateInput(startDate);
  const filterEnd = parseDateInput(endDate);
  const dateRangeInvalid =
    filterStart && filterEnd ? filterEnd < filterStart : false;

  const filteredEvents = useMemo(() => {
    if (dateRangeInvalid) {
      return [];
    }

    const filterEndOfDay = filterEnd ? endOfDay(filterEnd) : null;

    return enrichedEvents.filter((event) => {
      if (filterStart && event.start < filterStart) {
        return false;
      }
      if (filterEndOfDay && event.start > filterEndOfDay) {
        return false;
      }
      if (selectedVenue !== "all") {
        if (selectedVenue === "unassigned") {
          if (event.venueName?.trim()) {
            return false;
          }
        } else if (event.venueName?.trim() !== selectedVenue) {
          return false;
        }
      }
      if (selectedStatus !== "all" && event.status !== selectedStatus) {
        return false;
      }
      if (
        selectedTags.length > 0 &&
        !selectedTags.some((tag) => event.displayTags.includes(tag))
      ) {
        return false;
      }
      if (activeQuickFilters.includes("live-now") && !event.isLive) {
        return false;
      }
      if (
        activeQuickFilters.includes("starting-soon") &&
        !event.isStartingSoon
      ) {
        return false;
      }
      if (
        activeQuickFilters.includes("high-capacity") &&
        !event.isHighCapacity
      ) {
        return false;
      }
      if (activeQuickFilters.includes("sold-out") && !event.soldOut) {
        return false;
      }

      return true;
    });
  }, [
    activeQuickFilters,
    dateRangeInvalid,
    enrichedEvents,
    filterEnd,
    filterStart,
    selectedStatus,
    selectedTags,
    selectedVenue,
  ]);

  const opsEvents = useMemo(() => {
    const todayStart = startOfDay(now);
    const windowEnd = addHours(now, 24);

    return filteredEvents
      .filter((event) => event.start >= todayStart && event.start <= windowEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [filteredEvents, now]);

  const metrics = useMemo(() => {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const totalToday = filteredEvents.filter(
      (event) => event.start >= todayStart && event.start <= todayEnd
    ).length;
    const liveNow = filteredEvents.filter((event) => event.isLive).length;
    const upcoming24h = filteredEvents.filter(
      (event) => event.start > now && event.start <= addHours(now, 24)
    ).length;
    const soldOut = filteredEvents.filter((event) => event.soldOut).length;

    return { totalToday, liveNow, upcoming24h, soldOut };
  }, [filteredEvents, now]);

  const queueEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const diff = a.start.getTime() - b.start.getTime();
      if (diff !== 0) {
        return diff;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }, [filteredEvents]);

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredEvents>();
    for (const event of filteredEvents) {
      const key = calendarDateFormatter.format(event.start);
      const existing = groups.get(key);
      if (existing) {
        existing.push(event);
      } else {
        groups.set(key, [event]);
      }
    }

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        date: items[0]?.start ?? new Date(),
        items: items.sort((a, b) => a.start.getTime() - b.start.getTime()),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredEvents]);

  const selectedEvent = useMemo(
    () => enrichedEvents.find((event) => event.id === selectedEventId) ?? null,
    [enrichedEvents, selectedEventId]
  );

  const hasActiveFilters =
    activeQuickFilters.length > 0 ||
    selectedVenue !== "all" ||
    selectedStatus !== "all" ||
    selectedTags.length > 0 ||
    startDate.length > 0 ||
    endDate.length > 0;

  const handleResetFilters = () => {
    setActiveQuickFilters([]);
    setSelectedVenue("all");
    setSelectedStatus("all");
    setSelectedTags([]);
    setStartDate("");
    setEndDate("");
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((value) => value !== tag)
        : [...prev, tag]
    );
  };

  const handleCopyLink = async (eventId: string) => {
    const url = `${window.location.origin}/events/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Event link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Unable to copy link. Please try again.");
    }
  };

  const buildCalendarUrl = (event: (typeof enrichedEvents)[number]) => {
    const start = formatCalendarDate(event.start);
    const end = formatCalendarDate(addDays(event.start, 1));
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      [
        `Event type: ${event.eventType}`,
        event.eventNumber ? `Event #${event.eventNumber}` : "",
        event.notes ?? "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    const location = encodeURIComponent(
      [event.venueName, event.venueAddress].filter(Boolean).join(" · ")
    );
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  const filtersPanelProps: FiltersPanelProps = {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedVenue,
    setSelectedVenue,
    venueOptions,
    selectedStatus,
    setSelectedStatus,
    eventStatuses,
    selectedTags,
    tagOptions,
    onToggleTag: handleToggleTag,
    filteredCount: filteredEvents.length,
    hasActiveFilters,
    onResetFilters: handleResetFilters,
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays />
            </EmptyMedia>
            <EmptyTitle>No events yet</EmptyTitle>
            <EmptyDescription>
              Create your first event to start running kitchen operations with
              real data.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/events/new">Create event</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/events/import">Import events</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0 pb-28">
      <section className="relative overflow-hidden rounded-2xl border bg-background/70 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_60%)]" />
        <GridBackground
          className="absolute inset-0"
          fade
          gridOpacity={0.2}
          gridSize={36}
          variant="dots"
        />
        <div className="relative z-10 space-y-6 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Kitchen operations control room
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Today + next 24 hours
              </h2>
              <p className="text-sm text-muted-foreground">
                Live service visibility, timeline control, and rapid actions
                across events.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup
                onValueChange={(value) =>
                  setViewMode((value as ViewMode) || "timeline")
                }
                size="sm"
                type="single"
                value={viewMode}
                variant="outline"
              >
                <ToggleGroupItem value="timeline">
                  <LayoutGrid className="mr-1 size-3.5" />
                  Timeline
                </ToggleGroupItem>
                <ToggleGroupItem value="queue">
                  <List className="mr-1 size-3.5" />
                  Queue
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="hidden items-center gap-2 lg:flex">
                <Button asChild size="sm" variant="outline">
                  <Link href="/events">All events</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/events/import">Import</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToggleGroup
              onValueChange={(value) =>
                setActiveQuickFilters(value as QuickFilter[])
              }
              size="sm"
              type="multiple"
              value={activeQuickFilters}
              variant="outline"
            >
              <ToggleGroupItem value="live-now">
                <Activity className="mr-1 size-3.5" />
                Live now
              </ToggleGroupItem>
              <ToggleGroupItem value="starting-soon">
                <Clock className="mr-1 size-3.5" />
                Starting soon
              </ToggleGroupItem>
              <ToggleGroupItem value="high-capacity">
                <Users className="mr-1 size-3.5" />
                High capacity
              </ToggleGroupItem>
              <ToggleGroupItem value="sold-out">
                <Flame className="mr-1 size-3.5" />
                Sold out
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-transparent bg-background/70">
              <CardHeader className="pb-2">
                <CardDescription>Events today</CardDescription>
                <CardTitle className="text-3xl">{metrics.totalToday}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Current day coverage
              </CardContent>
            </Card>
            <Card className="border-transparent bg-background/70">
              <CardHeader className="pb-2">
                <CardDescription>Live now</CardDescription>
                <CardTitle className="text-3xl">{metrics.liveNow}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Actively running
              </CardContent>
            </Card>
            <Card className="border-transparent bg-background/70">
              <CardHeader className="pb-2">
                <CardDescription>Upcoming in 24h</CardDescription>
                <CardTitle className="text-3xl">
                  {metrics.upcoming24h}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Next service window
              </CardContent>
            </Card>
            <Card className="border-transparent bg-background/70">
              <CardHeader className="pb-2">
                <CardDescription>Sold out</CardDescription>
                <CardTitle className="text-3xl">{metrics.soldOut}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Tag-driven capacity alert
              </CardContent>
            </Card>
          </section>
        </div>
      </section>

      <Separator />

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <Card className="border-muted/60 bg-background/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Refine the operational view.</CardDescription>
            </CardHeader>
            <CardContent>
              {mounted ? (
                <FiltersPanel {...filtersPanelProps} />
              ) : (
                <div className="space-y-5" />
              )}
            </CardContent>
          </Card>
        </aside>

        <main className="flex flex-col gap-8">
          {dateRangeInvalid && (
            <Alert variant="destructive">
              <Clock />
              <AlertTitle>Invalid date range</AlertTitle>
              <AlertDescription>
                <p>End date must be on or after the start date.</p>
                <Button
                  className="mt-3"
                  onClick={handleResetFilters}
                  size="sm"
                  variant="outline"
                >
                  Reset filters
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!dateRangeInvalid && filteredEvents.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CalendarDays className="size-10 text-muted-foreground/70" />
                <h3 className="text-lg font-semibold">
                  No events match these filters
                </h3>
                <p className="text-sm text-muted-foreground">
                  Adjust filters to reveal upcoming operational coverage.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleResetFilters} variant="secondary">
                    Reset filters
                  </Button>
                  <Button asChild>
                    <Link href="/events">View all events</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!dateRangeInvalid && filteredEvents.length > 0 && (
            <>
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Live operations
                  </h3>
                  <Badge className="text-xs" variant="outline">
                    {opsEvents.length} in window
                  </Badge>
                </div>

                {opsEvents.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-between py-8 text-sm text-muted-foreground">
                      No events are scheduled in the next 24 hours.
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/events/new">Create event</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {opsEvents.map((event, index) => {
                      const countdownLabel = event.isLive
                        ? `Live for ${formatDuration(now.getTime() - event.start.getTime())}`
                        : event.isUpcoming
                          ? `Starts in ${formatDuration(event.start.getTime() - now.getTime())}`
                          : `Ended ${formatDuration(now.getTime() - event.end.getTime())} ago`;
                      const operationalBadge =
                        operationalStatusConfig[event.operationalStatus];
                      const statusVariant =
                        statusVariantMap[
                          event.status as keyof typeof statusVariantMap
                        ] ?? "outline";

                      return (
                        <div
                          className={cn(
                            "group rounded-2xl border bg-background/80 p-4 transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            mounted
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 translate-y-2"
                          )}
                          key={event.id}
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setDrawerOpen(true);
                          }}
                          onKeyDown={(eventKey) => {
                            if (
                              eventKey.key === "Enter" ||
                              eventKey.key === " "
                            ) {
                              eventKey.preventDefault();
                              setSelectedEventId(event.id);
                              setDrawerOpen(true);
                            }
                          }}
                          role="button"
                          style={{ transitionDelay: `${index * 40}ms` }}
                          tabIndex={0}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-[260px] flex-1 flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    operationalBadge.className
                                  )}
                                >
                                  {operationalBadge.label}
                                </Badge>
                                {event.soldOut && (
                                  <Badge
                                    className="text-xs"
                                    variant="destructive"
                                  >
                                    Sold out
                                  </Badge>
                                )}
                                {event.limited && (
                                  <Badge
                                    className="text-xs"
                                    variant="secondary"
                                  >
                                    Limited
                                  </Badge>
                                )}
                                <Badge
                                  className="text-xs capitalize"
                                  variant={statusVariant}
                                >
                                  {event.status}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm font-semibold">
                                  {event.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {event.eventType} ·{" "}
                                  {shortDateFormatter.format(event.eventDate)}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3.5" />
                                  {event.venueName?.trim() || "Venue not set"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="size-3.5" />
                                  {event.guestCount} guests
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Timer className="size-3.5" />
                                {countdownLabel}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  asChild
                                  onClick={(eventClick) =>
                                    eventClick.stopPropagation()
                                  }
                                  size="sm"
                                  variant="secondary"
                                >
                                  <Link href={`/events/${event.id}`}>
                                    Open event
                                  </Link>
                                </Button>
                                {/* Event lifecycle actions (mark started/finished) are omitted because
                                   the current events API only supports full updates, not lifecycle transitions. */}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {viewMode === "timeline" ? "Timeline view" : "Event queue"}
                  </h3>
                  <Badge className="text-xs" variant="outline">
                    {filteredEvents.length} total
                  </Badge>
                </div>

                {viewMode === "timeline" ? (
                  <div className="space-y-4">
                    {timelineGroups.map((group, groupIndex) => (
                      <Card className="overflow-hidden" key={group.key}>
                        <CardHeader className="border-b bg-muted/40 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {dateFormatter.format(group.date)}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {group.items.length} scheduled
                              </CardDescription>
                            </div>
                            <Badge className="text-xs" variant="secondary">
                              All-day block
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                          {group.items.map((event, index) => {
                            const operationalBadge =
                              operationalStatusConfig[event.operationalStatus];
                            const statusVariant =
                              statusVariantMap[
                                event.status as keyof typeof statusVariantMap
                              ] ?? "outline";

                            return (
                              <div
                                className={cn(
                                  "group relative rounded-xl border border-border/60 bg-background/70 p-4 transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                  mounted
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-2"
                                )}
                                key={event.id}
                                onClick={() => {
                                  setSelectedEventId(event.id);
                                  setDrawerOpen(true);
                                }}
                                onKeyDown={(eventKey) => {
                                  if (
                                    eventKey.key === "Enter" ||
                                    eventKey.key === " "
                                  ) {
                                    eventKey.preventDefault();
                                    setSelectedEventId(event.id);
                                    setDrawerOpen(true);
                                  }
                                }}
                                role="button"
                                style={{
                                  transitionDelay: `${(groupIndex + index) * 40}ms`,
                                }}
                                tabIndex={0}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted/40">
                                      <CalendarDays className="size-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold">
                                          {event.title}
                                        </p>
                                        <Badge
                                          className={cn(
                                            "text-xs",
                                            operationalBadge.className
                                          )}
                                        >
                                          {operationalBadge.label}
                                        </Badge>
                                        <Badge
                                          className="text-xs capitalize"
                                          variant={statusVariant}
                                        >
                                          {event.status}
                                        </Badge>
                                        {event.soldOut && (
                                          <Badge
                                            className="text-xs"
                                            variant="destructive"
                                          >
                                            Sold out
                                          </Badge>
                                        )}
                                        {event.limited && (
                                          <Badge
                                            className="text-xs"
                                            variant="secondary"
                                          >
                                            Limited
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {event.eventType} ·{" "}
                                        {event.venueName?.trim() ||
                                          "Venue not set"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="size-3.5" />
                                      {event.guestCount} guests
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="size-3.5" />
                                      All-day
                                    </span>
                                    <Button
                                      asChild
                                      onClick={(eventClick) =>
                                        eventClick.stopPropagation()
                                      }
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Link href={`/events/${event.id}`}>
                                        Open
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Queue list</CardTitle>
                      <CardDescription className="text-xs">
                        Sorted by service date.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {queueEvents.map((event, index) => {
                        const operationalBadge =
                          operationalStatusConfig[event.operationalStatus];
                        const statusVariant =
                          statusVariantMap[
                            event.status as keyof typeof statusVariantMap
                          ] ?? "outline";
                        const countdownLabel = event.isLive
                          ? `Live ${formatDuration(now.getTime() - event.start.getTime())}`
                          : event.isUpcoming
                            ? `In ${formatDuration(event.start.getTime() - now.getTime())}`
                            : "Finished";

                        return (
                          <div
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3 transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              mounted
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-2"
                            )}
                            key={event.id}
                            onClick={() => {
                              setSelectedEventId(event.id);
                              setDrawerOpen(true);
                            }}
                            onKeyDown={(eventKey) => {
                              if (
                                eventKey.key === "Enter" ||
                                eventKey.key === " "
                              ) {
                                eventKey.preventDefault();
                                setSelectedEventId(event.id);
                                setDrawerOpen(true);
                              }
                            }}
                            role="button"
                            style={{ transitionDelay: `${index * 35}ms` }}
                            tabIndex={0}
                          >
                            <div className="min-w-[240px] flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">
                                  {event.title}
                                </p>
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    operationalBadge.className
                                  )}
                                >
                                  {operationalBadge.label}
                                </Badge>
                                <Badge
                                  className="text-xs capitalize"
                                  variant={statusVariant}
                                >
                                  {event.status}
                                </Badge>
                                {event.soldOut && (
                                  <Badge
                                    className="text-xs"
                                    variant="destructive"
                                  >
                                    Sold out
                                  </Badge>
                                )}
                                {event.limited && (
                                  <Badge
                                    className="text-xs"
                                    variant="secondary"
                                  >
                                    Limited
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="size-3.5" />
                                  {shortDateFormatter.format(event.eventDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3.5" />
                                  {event.venueName?.trim() || "Venue not set"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="size-3.5" />
                                  {event.guestCount} guests
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Timer className="size-3.5" />
                                {countdownLabel}
                              </span>
                              <Button
                                asChild
                                onClick={(eventClick) =>
                                  eventClick.stopPropagation()
                                }
                                size="sm"
                                variant="ghost"
                              >
                                <Link href={`/events/${event.id}`}>Open</Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {mounted && (
        <Drawer
          direction="right"
          onOpenChange={setDrawerOpen}
          open={drawerOpen}
        >
          <DrawerContent className="w-[420px] sm:max-w-md">
            {selectedEvent ? (
              <>
                <DrawerHeader>
                  <DrawerTitle>{selectedEvent.title}</DrawerTitle>
                  <DrawerDescription>
                    {selectedEvent.eventNumber
                      ? `Event #${selectedEvent.eventNumber}`
                      : "Event number not set"}
                  </DrawerDescription>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      className="text-xs capitalize"
                      variant={
                        statusVariantMap[
                          selectedEvent.status as keyof typeof statusVariantMap
                        ] ?? "outline"
                      }
                    >
                      {selectedEvent.status}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-xs",
                        operationalStatusConfig[selectedEvent.operationalStatus]
                          .className
                      )}
                    >
                      {
                        operationalStatusConfig[selectedEvent.operationalStatus]
                          .label
                      }
                    </Badge>
                    {selectedEvent.soldOut && (
                      <Badge className="text-xs" variant="destructive">
                        Sold out
                      </Badge>
                    )}
                    {selectedEvent.limited && (
                      <Badge className="text-xs" variant="secondary">
                        Limited
                      </Badge>
                    )}
                  </div>
                </DrawerHeader>
                <div className="space-y-4 px-4 pb-2">
                  <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Service date
                      </span>
                      <span className="font-medium">
                        {dateFormatter.format(selectedEvent.eventDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">All-day</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">
                        {selectedEvent.venueName?.trim() || "Venue not set"}
                      </span>
                    </div>
                    {selectedEvent.venueAddress && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Address</span>
                        <span className="font-medium">
                          {selectedEvent.venueAddress}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Guests</span>
                      {/* Capacity/RSVP fields are not available; guestCount is the only headcount signal. */}
                      <span className="font-medium">
                        {selectedEvent.guestCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Event type</span>
                      <span className="font-medium capitalize">
                        {selectedEvent.eventType}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.displayTags.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.displayTags.map((tag) => (
                          <Badge
                            className="text-xs"
                            key={tag}
                            variant="outline"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.notes}
                      </p>
                    </div>
                  )}
                </div>
                <DrawerFooter>
                  <div className="grid gap-2">
                    <Button asChild>
                      <Link href={`/events/${selectedEvent.id}`}>
                        Open event
                      </Link>
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(selectedEvent.id)}
                      variant="secondary"
                    >
                      <ClipboardCopy className="mr-2 size-4" />
                      Copy link
                    </Button>
                    <Button asChild variant="outline">
                      <a
                        href={buildCalendarUrl(selectedEvent)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <CalendarPlus className="mr-2 size-4" />
                        Add to calendar
                      </a>
                    </Button>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost">Close</Button>
                  </DrawerClose>
                  {/* Organizer, pricing, ticketing, and RSVP details are omitted because
                    the current event schema does not expose those fields. */}
                </DrawerFooter>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                Select an event to see details.
              </div>
            )}
          </DrawerContent>
        </Drawer>
      )}

      <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-3 rounded-2xl border bg-background/80 p-3 shadow-lg backdrop-blur md:hidden">
        {mounted ? (
          <Sheet onOpenChange={setFilterSheetOpen} open={filterSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline">
                <Filter className="mr-2 size-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[340px]" side="right">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FiltersPanel {...filtersPanelProps} />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button disabled size="sm" variant="outline">
            <Filter className="mr-2 size-4" />
            Filters
          </Button>
        )}
        <ToggleGroup
          onValueChange={(value) =>
            setViewMode((value as ViewMode) || "timeline")
          }
          size="sm"
          type="single"
          value={viewMode}
          variant="outline"
        >
          <ToggleGroupItem value="timeline">
            <LayoutGrid className="mr-1 size-3.5" />
            Timeline
          </ToggleGroupItem>
          <ToggleGroupItem value="queue">
            <List className="mr-1 size-3.5" />
            Queue
          </ToggleGroupItem>
        </ToggleGroup>
        <Button asChild size="sm">
          <Link href="/events/new">New event</Link>
        </Button>
      </div>
    </div>
  );
};
