"use client";

import { PageCanvas } from "@repo/design-system/components/blocks/page-shell";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
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
    className:
      "rounded-full border border-[#d9d9dd] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#17171c]",
  },
  live: {
    label: "Live",
    className:
      "rounded-full border border-transparent bg-[#003c33] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white",
  },
  finished: {
    label: "Finished",
    className:
      "rounded-full border border-[#e5e7eb] bg-[#eeece7] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#616161]",
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
      <PageCanvas className="gap-8 pb-14">
        <section className="rounded-[22px] border border-dashed border-[#d9d9dd] bg-[#eeece7] px-8 py-16 sm:px-16 sm:py-20">
          <div className="mx-auto flex max-w-2xl flex-col items-start gap-6">
            <span className="inline-flex size-12 items-center justify-center rounded-full border border-[#d9d9dd] bg-white text-[#003c33]">
              <CalendarDays className="size-5" />
            </span>
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[#75758a]">
              Kitchen operations / empty
            </p>
            <h2 className="font-display text-4xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground sm:text-5xl">
              No events yet.
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-[#454553]">
              Create your first event to start running kitchen operations with
              real data.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                asChild
                className="rounded-full bg-[#17171c] px-5 text-[13px] font-medium text-white hover:bg-[#17171c]/90"
                size="sm"
              >
                <Link href="/events/new">Create event</Link>
              </Button>
              <Button
                asChild
                className="rounded-full border border-[#d9d9dd] bg-white px-5 text-[13px] font-medium text-[#17171c] hover:bg-white/70"
                size="sm"
                variant="outline"
              >
                <Link href="/events/import">Import events</Link>
              </Button>
            </div>
          </div>
        </section>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <section className="overflow-hidden rounded-[22px] border border-[#003c33] bg-[#003c33] text-white">
        <div className="space-y-10 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-white/60">
                Kitchen operations / control room
              </p>
              <h2 className="font-display text-4xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-5xl">
                Today &amp; the next 24 hours.
              </h2>
              <p className="max-w-xl text-base leading-relaxed text-white/70">
                Live service visibility, timeline control, and rapid actions
                across events &mdash; in one quiet, deliberate view.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup
                className="rounded-full border border-white/20 bg-white/5 p-1"
                onValueChange={(value) =>
                  setViewMode((value as ViewMode) || "timeline")
                }
                size="sm"
                type="single"
                value={viewMode}
                variant="outline"
              >
                <ToggleGroupItem
                  className="rounded-full border-0 px-4 text-[13px] text-white/70 data-[state=on]:bg-white data-[state=on]:text-[#003c33]"
                  value="timeline"
                >
                  <LayoutGrid className="mr-1 size-3.5" />
                  Timeline
                </ToggleGroupItem>
                <ToggleGroupItem
                  className="rounded-full border-0 px-4 text-[13px] text-white/70 data-[state=on]:bg-white data-[state=on]:text-[#003c33]"
                  value="queue"
                >
                  <List className="mr-1 size-3.5" />
                  Queue
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="hidden items-center gap-2 lg:flex">
                <Button
                  asChild
                  className="rounded-full border border-white/30 bg-transparent px-5 text-[13px] font-medium text-white hover:bg-white/10 hover:text-white"
                  size="sm"
                  variant="outline"
                >
                  <Link href="/events">All events</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-full bg-white px-5 text-[13px] font-medium text-[#17171c] hover:bg-white/90"
                  size="sm"
                >
                  <Link href="/events/import">Import</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/50">
              Quick filters
            </span>
            <ToggleGroup
              className="flex flex-wrap gap-2"
              onValueChange={(value) =>
                setActiveQuickFilters(value as QuickFilter[])
              }
              size="sm"
              type="multiple"
              value={activeQuickFilters}
              variant="outline"
            >
              <ToggleGroupItem
                className="rounded-full border border-white/25 bg-transparent px-3.5 py-1 text-[12px] text-white/80 data-[state=on]:border-transparent data-[state=on]:bg-white data-[state=on]:text-[#003c33]"
                value="live-now"
              >
                <Activity className="mr-1 size-3.5" />
                Live now
              </ToggleGroupItem>
              <ToggleGroupItem
                className="rounded-full border border-white/25 bg-transparent px-3.5 py-1 text-[12px] text-white/80 data-[state=on]:border-transparent data-[state=on]:bg-white data-[state=on]:text-[#003c33]"
                value="starting-soon"
              >
                <Clock className="mr-1 size-3.5" />
                Starting soon
              </ToggleGroupItem>
              <ToggleGroupItem
                className="rounded-full border border-white/25 bg-transparent px-3.5 py-1 text-[12px] text-white/80 data-[state=on]:border-transparent data-[state=on]:bg-white data-[state=on]:text-[#003c33]"
                value="high-capacity"
              >
                <Users className="mr-1 size-3.5" />
                High capacity
              </ToggleGroupItem>
              <ToggleGroupItem
                className="rounded-full border border-white/25 bg-transparent px-3.5 py-1 text-[12px] text-[#ffad9b] data-[state=on]:border-transparent data-[state=on]:bg-[#ff7759] data-[state=on]:text-white"
                value="sold-out"
              >
                <Flame className="mr-1 size-3.5" />
                Sold out
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <section className="grid gap-px overflow-hidden rounded-[16px] border border-white/15 bg-white/15 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-4 bg-[#003c33] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/55">
                Events today
              </p>
              <p className="text-5xl font-normal leading-none tracking-[-0.02em]">
                {metrics.totalToday}
              </p>
              <p className="text-[12px] text-white/55">Current day coverage</p>
            </div>
            <div className="flex flex-col gap-4 bg-[#003c33] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/55">
                Live now
              </p>
              <p className="text-5xl font-normal leading-none tracking-[-0.02em]">
                {metrics.liveNow}
              </p>
              <p className="text-[12px] text-white/55">Actively running</p>
            </div>
            <div className="flex flex-col gap-4 bg-[#003c33] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/55">
                Upcoming · 24h
              </p>
              <p className="text-5xl font-normal leading-none tracking-[-0.02em]">
                {metrics.upcoming24h}
              </p>
              <p className="text-[12px] text-white/55">Next service window</p>
            </div>
            <div className="flex flex-col gap-4 bg-[#003c33] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#ffad9b]">
                Sold out
              </p>
              <p className="text-5xl font-normal leading-none tracking-[-0.02em] text-[#ff7759]">
                {metrics.soldOut}
              </p>
              <p className="text-[12px] text-white/55">
                Tag-driven capacity alert
              </p>
            </div>
          </section>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-[16px] border border-[#d9d9dd] bg-[#eeece7] p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
              Filters
            </p>
            <h3 className="mt-2 text-2xl font-normal leading-tight tracking-[-0.01em] text-[#17171c]">
              Refine the view.
            </h3>
            <div className="mt-6 border-t border-[#d9d9dd] pt-6">
              {mounted ? (
                <FiltersPanel {...filtersPanelProps} />
              ) : (
                <div className="space-y-5" />
              )}
            </div>
          </div>
        </aside>

        <main className="flex flex-col gap-12">
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
            <div className="rounded-[22px] border border-dashed border-[#d9d9dd] bg-white px-8 py-16">
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
                <CalendarDays
                  className="size-8 text-[#75758a]"
                  strokeWidth={1.25}
                />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
                  No matches
                </p>
                <h3 className="text-3xl font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]">
                  Nothing matches these filters.
                </h3>
                <p className="text-[15px] leading-relaxed text-[#616161]">
                  Adjust filters to reveal upcoming operational coverage.
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    className="rounded-full border border-[#17171c] bg-transparent px-5 text-[13px] font-medium text-[#17171c] hover:bg-[#17171c] hover:text-white"
                    onClick={handleResetFilters}
                    variant="outline"
                  >
                    Reset filters
                  </Button>
                  <Button
                    asChild
                    className="rounded-full bg-[#17171c] px-5 text-[13px] font-medium text-white hover:bg-[#17171c]/90"
                  >
                    <Link href="/events">View all events</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!dateRangeInvalid && filteredEvents.length > 0 && (
            <>
              <section className="space-y-5">
                <div className="flex items-end justify-between border-b border-[#d9d9dd] pb-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
                      Live operations
                    </p>
                    <h3 className="mt-1 text-3xl font-normal leading-tight tracking-[-0.01em] text-[#17171c]">
                      In window now.
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#d9d9dd] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#17171c]">
                    {opsEvents.length} in 24h
                  </span>
                </div>

                {opsEvents.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-dashed border-[#d9d9dd] bg-white px-6 py-6 text-[15px] text-[#616161]">
                    No events are scheduled in the next 24 hours.
                    <Button
                      asChild
                      className="rounded-full bg-[#17171c] px-5 text-[13px] font-medium text-white hover:bg-[#17171c]/90"
                      size="sm"
                    >
                      <Link href="/events/new">Create event</Link>
                    </Button>
                  </div>
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
                            "group rounded-[22px] border border-[#d9d9dd] bg-white p-6 transition-all hover:border-[#17171c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6ee6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                            event.isLive && "border-[#003c33] bg-[#edfce9]",
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
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-[260px] flex-1 flex-col gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={operationalBadge.className}>
                                  {operationalBadge.label}
                                </span>
                                {event.soldOut && (
                                  <span className="rounded-full border border-[#ff7759] bg-[#ff7759] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white">
                                    Sold out
                                  </span>
                                )}
                                {event.limited && (
                                  <span className="rounded-full border border-[#ffad9b] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff7759]">
                                    Limited
                                  </span>
                                )}
                                <span className="rounded-full border border-[#d9d9dd] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] capitalize text-[#616161]">
                                  {event.status}
                                </span>
                              </div>
                              <div>
                                <p className="text-[20px] font-normal leading-tight tracking-[-0.01em] text-[#17171c]">
                                  {event.title}
                                </p>
                                <p className="mt-1 text-[13px] text-[#75758a]">
                                  {event.eventType} ·{" "}
                                  {shortDateFormatter.format(event.eventDate)}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#616161]">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="size-3.5" />
                                  {event.venueName?.trim() ||
                                    "No venue assigned"}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Users className="size-3.5" />
                                  {event.guestCount} guests
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-[#75758a]">
                                <Timer className="size-3.5" />
                                {countdownLabel}
                              </span>
                              <Button
                                asChild
                                className="rounded-full bg-[#17171c] px-5 text-[13px] font-medium text-white hover:bg-[#17171c]/90"
                                onClick={(eventClick) =>
                                  eventClick.stopPropagation()
                                }
                                size="sm"
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
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <div className="flex items-end justify-between border-b border-[#d9d9dd] pb-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
                      {viewMode === "timeline" ? "Timeline" : "Queue"}
                    </p>
                    <h3 className="mt-1 text-3xl font-normal leading-tight tracking-[-0.01em] text-[#17171c]">
                      {viewMode === "timeline"
                        ? "Service days, sequenced."
                        : "Every event, in line."}
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#d9d9dd] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#17171c]">
                    {filteredEvents.length} total
                  </span>
                </div>

                {viewMode === "timeline" ? (
                  <div className="space-y-5">
                    {timelineGroups.map((group, groupIndex) => (
                      <div
                        className="overflow-hidden rounded-[16px] border border-[#d9d9dd] bg-white"
                        key={group.key}
                      >
                        <div className="flex items-center justify-between border-b border-[#d9d9dd] bg-[#eeece7] px-6 py-4">
                          <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
                              {group.items.length} scheduled
                            </p>
                            <p className="mt-1 text-[22px] font-normal leading-tight tracking-[-0.01em] text-[#17171c]">
                              {dateFormatter.format(group.date)}
                            </p>
                          </div>
                          <span className="rounded-full border border-[#d9d9dd] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#616161]">
                            All-day block
                          </span>
                        </div>
                        <div className="space-y-0 p-2 sm:p-4">
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
                                  "group relative flex flex-wrap items-center justify-between gap-4 border-b border-[#d9d9dd] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#f1f5ff]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6ee6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                                  mounted
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-1"
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
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d9dd] bg-white">
                                    <CalendarDays
                                      className="size-4 text-[#75758a]"
                                      strokeWidth={1.5}
                                    />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-[16px] font-normal tracking-[-0.005em] text-[#17171c]">
                                        {event.title}
                                      </p>
                                      <span
                                        className={operationalBadge.className}
                                      >
                                        {operationalBadge.label}
                                      </span>
                                      <span className="rounded-full border border-[#d9d9dd] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] capitalize text-[#616161]">
                                        {event.status}
                                      </span>
                                      {event.soldOut && (
                                        <span className="rounded-full border border-[#ff7759] bg-[#ff7759] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white">
                                          Sold out
                                        </span>
                                      )}
                                      {event.limited && (
                                        <span className="rounded-full border border-[#ffad9b] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff7759]">
                                          Limited
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-1 text-[13px] text-[#75758a]">
                                      {event.eventType} ·{" "}
                                      {event.venueName?.trim() ||
                                        "No venue assigned"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-5 text-[12px] text-[#616161]">
                                  <span className="flex items-center gap-1.5">
                                    <Users className="size-3.5" />
                                    {event.guestCount} guests
                                  </span>
                                  <span className="hidden items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-[#75758a] sm:flex">
                                    <CalendarDays className="size-3.5" />
                                    All-day
                                  </span>
                                  <Button
                                    asChild
                                    className="rounded-full px-4 text-[13px] font-medium text-[#1863dc] hover:bg-transparent hover:underline"
                                    onClick={(eventClick) =>
                                      eventClick.stopPropagation()
                                    }
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <Link href={`/events/${event.id}`}>
                                      Open →
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[16px] border border-[#d9d9dd] bg-white">
                    <div className="border-b border-[#d9d9dd] bg-[#eeece7] px-6 py-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
                        Sorted by service date
                      </p>
                      <p className="mt-1 text-[22px] font-normal leading-tight tracking-[-0.01em] text-[#17171c]">
                        Queue list
                      </p>
                    </div>
                    <div className="divide-y divide-[#d9d9dd]">
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
                              "flex flex-wrap items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[#f1f5ff]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6ee6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                              mounted
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-1"
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
                                <p className="text-[16px] font-normal tracking-[-0.005em] text-[#17171c]">
                                  {event.title}
                                </p>
                                <span className={operationalBadge.className}>
                                  {operationalBadge.label}
                                </span>
                                <span className="rounded-full border border-[#d9d9dd] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] capitalize text-[#616161]">
                                  {event.status}
                                </span>
                                {event.soldOut && (
                                  <span className="rounded-full border border-[#ff7759] bg-[#ff7759] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white">
                                    Sold out
                                  </span>
                                )}
                                {event.limited && (
                                  <span className="rounded-full border border-[#ffad9b] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff7759]">
                                    Limited
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-[#616161]">
                                <span className="flex items-center gap-1.5">
                                  <CalendarDays className="size-3.5" />
                                  {shortDateFormatter.format(event.eventDate)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="size-3.5" />
                                  {event.venueName?.trim() ||
                                    "No venue assigned"}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Users className="size-3.5" />
                                  {event.guestCount} guests
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-5">
                              <span className="hidden items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-[#75758a] sm:flex">
                                <Timer className="size-3.5" />
                                {countdownLabel}
                              </span>
                              <Button
                                asChild
                                className="rounded-full px-4 text-[13px] font-medium text-[#1863dc] hover:bg-transparent hover:underline"
                                onClick={(eventClick) =>
                                  eventClick.stopPropagation()
                                }
                                size="sm"
                                variant="ghost"
                              >
                                <Link href={`/events/${event.id}`}>Open →</Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
          <DrawerContent className="w-[420px] border-l border-[#d9d9dd] bg-white text-[#17171c] sm:max-w-md">
            {selectedEvent ? (
              <>
                <DrawerHeader className="space-y-3 border-b border-[#d9d9dd] px-6 py-6">
                  <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[#75758a]">
                    {selectedEvent.eventNumber
                      ? `Event / #${selectedEvent.eventNumber}`
                      : "Event / detail"}
                  </p>
                  <DrawerTitle className="text-[28px] font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]">
                    {selectedEvent.title}
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">
                    {selectedEvent.eventNumber
                      ? `Event #${selectedEvent.eventNumber}`
                      : "No event number"}
                  </DrawerDescription>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="rounded-full border border-[#d9d9dd] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#17171c]">
                      {selectedEvent.status}
                    </span>
                    <span
                      className={cn(
                        operationalStatusConfig[selectedEvent.operationalStatus]
                          .className
                      )}
                    >
                      {
                        operationalStatusConfig[selectedEvent.operationalStatus]
                          .label
                      }
                    </span>
                    {selectedEvent.soldOut && (
                      <span className="rounded-full border border-transparent bg-[#ff7759] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white">
                        Sold out
                      </span>
                    )}
                    {selectedEvent.limited && (
                      <span className="rounded-full border border-[#d9d9dd] bg-[#eeece7] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#454553]">
                        Limited
                      </span>
                    )}
                  </div>
                </DrawerHeader>
                <div className="space-y-6 px-6 pt-6 pb-2">
                  <div className="rounded-[16px] border border-[#d9d9dd] bg-[#eeece7]">
                    <dl className="divide-y divide-[#d9d9dd]">
                      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#75758a]">
                          Service date
                        </dt>
                        <dd className="font-medium text-[#17171c]">
                          {dateFormatter.format(selectedEvent.eventDate)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#75758a]">
                          Time
                        </dt>
                        <dd className="font-medium text-[#17171c]">All-day</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#75758a]">
                          Location
                        </dt>
                        <dd className="text-right font-medium text-[#17171c]">
                          {selectedEvent.venueName?.trim() ||
                            "No venue assigned"}
                        </dd>
                      </div>
                      {selectedEvent.venueAddress && (
                        <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                          <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#75758a]">
                            Address
                          </dt>
                          <dd className="text-right font-medium text-[#17171c]">
                            {selectedEvent.venueAddress}
                          </dd>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#75758a]">
                          Guests
                        </dt>
                        {/* Capacity/RSVP fields are not available; guestCount is the only headcount signal. */}
                        <dd className="font-medium text-[#17171c]">
                          {selectedEvent.guestCount}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#75758a]">
                          Event type
                        </dt>
                        <dd className="font-medium capitalize text-[#17171c]">
                          {selectedEvent.eventType}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {selectedEvent.displayTags.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.displayTags.map((tag) => (
                          <span
                            className="rounded-full border border-[#d9d9dd] bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#454553]"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div className="space-y-3">
                      <h4 className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#75758a]">
                        Notes
                      </h4>
                      <p className="text-sm leading-relaxed text-[#454553]">
                        {selectedEvent.notes}
                      </p>
                    </div>
                  )}
                </div>
                <DrawerFooter className="border-t border-[#d9d9dd] px-6 py-5">
                  <div className="grid gap-2">
                    <Button
                      asChild
                      className="rounded-full bg-[#17171c] text-[13px] font-medium text-white hover:bg-[#17171c]/90"
                    >
                      <Link href={`/events/${selectedEvent.id}`}>
                        Open event
                      </Link>
                    </Button>
                    <Button
                      className="rounded-full border border-[#d9d9dd] bg-white text-[13px] font-medium text-[#17171c] hover:bg-[#eeece7]"
                      onClick={() => handleCopyLink(selectedEvent.id)}
                      variant="outline"
                    >
                      <ClipboardCopy className="mr-2 size-4" />
                      Copy link
                    </Button>
                    <Button
                      asChild
                      className="rounded-full border border-[#d9d9dd] bg-white text-[13px] font-medium text-[#17171c] hover:bg-[#eeece7]"
                      variant="outline"
                    >
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
                    <Button
                      className="rounded-full text-[13px] font-medium text-[#75758a] hover:bg-transparent hover:text-[#17171c]"
                      variant="ghost"
                    >
                      Close
                    </Button>
                  </DrawerClose>
                  {/* Organizer, pricing, ticketing, and RSVP details are omitted because
                    the current event schema does not expose those fields. */}
                </DrawerFooter>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6 font-mono text-[12px] uppercase tracking-[0.28em] text-[#75758a]">
                Select an event to see details.
              </div>
            )}
          </DrawerContent>
        </Drawer>
      )}

      <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-3 rounded-full border border-[#d9d9dd] bg-white/95 p-2 backdrop-blur md:hidden">
        {mounted ? (
          <Sheet onOpenChange={setFilterSheetOpen} open={filterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                className="rounded-full border border-[#d9d9dd] bg-white px-4 text-[13px] font-medium text-[#17171c] hover:bg-[#eeece7]"
                size="sm"
                variant="outline"
              >
                <Filter className="mr-2 size-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent
              className="w-[340px] border-l border-[#d9d9dd] bg-white text-[#17171c]"
              side="right"
            >
              <SheetHeader className="border-b border-[#d9d9dd] px-6 py-6">
                <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[#75758a]">
                  Filters
                </p>
                <SheetTitle className="text-[24px] font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]">
                  Refine the view.
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 px-6">
                <FiltersPanel {...filtersPanelProps} />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button
            className="rounded-full border border-[#d9d9dd] bg-white px-4 text-[13px] font-medium text-[#75758a]"
            disabled
            size="sm"
            variant="outline"
          >
            <Filter className="mr-2 size-4" />
            Filters
          </Button>
        )}
        <ToggleGroup
          className="rounded-full border border-[#d9d9dd] bg-[#eeece7] p-1"
          onValueChange={(value) =>
            setViewMode((value as ViewMode) || "timeline")
          }
          size="sm"
          type="single"
          value={viewMode}
          variant="outline"
        >
          <ToggleGroupItem
            className="rounded-full border-0 px-3 text-[12px] text-[#454553] data-[state=on]:bg-white data-[state=on]:text-[#17171c]"
            value="timeline"
          >
            <LayoutGrid className="mr-1 size-3.5" />
            Timeline
          </ToggleGroupItem>
          <ToggleGroupItem
            className="rounded-full border-0 px-3 text-[12px] text-[#454553] data-[state=on]:bg-white data-[state=on]:text-[#17171c]"
            value="queue"
          >
            <List className="mr-1 size-3.5" />
            Queue
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          asChild
          className="rounded-full bg-[#17171c] px-4 text-[13px] font-medium text-white hover:bg-[#17171c]/90"
          size="sm"
        >
          <Link href="/events/new">New event</Link>
        </Button>
      </div>
    </PageCanvas>
  );
};
