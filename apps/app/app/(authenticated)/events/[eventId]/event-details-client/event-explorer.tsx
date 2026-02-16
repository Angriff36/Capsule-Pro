"use client";

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
  ActivityIcon,
  AlarmClockIcon,
  CalendarDaysIcon,
  CrownIcon,
  FilterIcon,
  Globe2Icon,
  LayoutGridIcon,
  ListIcon,
  ShieldCheckIcon,
  TagIcon,
  TicketIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import type { RelatedEventSummary } from "../event-details-types";
import {
  addDays,
  createCalendarDateFormatter,
  createShortDateFormatter,
  endOfDay,
  formatCurrency,
  formatDuration,
  startOfDay,
} from "./utils";

type ExplorerView = "grid" | "calendar";
type SortOption = "relevance" | "soonest" | "popularity" | "price";
type QuickFilter =
  | "live-now"
  | "starting-soon"
  | "high-capacity"
  | "sold-out"
  | "free"
  | "paid";

interface EventExplorerProps {
  now: Date;
  explorerView: ExplorerView;
  sortBy: SortOption;
  quickFilters: QuickFilter[];
  selectedDateStart: string;
  selectedDateEnd: string;
  selectedLocation: string;
  selectedOrganizer: string;
  selectedFormat: string;
  selectedPrice: string;
  selectedTags: string[];
  selectedAccessibility: string[];
  relatedEvents: RelatedEventSummary[];
  relatedGuestCounts: Record<string, number>;
  // State setters
  setExplorerView: (view: ExplorerView) => void;
  setSortBy: (sort: SortOption) => void;
  setQuickFilters: (filters: QuickFilter[]) => void;
  setSelectedDateStart: (date: string) => void;
  setSelectedDateEnd: (date: string) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedOrganizer: (organizer: string) => void;
  setSelectedFormat: (format: string) => void;
  setSelectedPrice: (price: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedAccessibility: (accessibility: string[]) => void;
  resetFilters: () => void;
}

export function EventExplorer({
  now,
  explorerView,
  sortBy,
  quickFilters,
  selectedDateStart,
  selectedDateEnd,
  selectedLocation,
  selectedOrganizer,
  selectedFormat,
  selectedPrice,
  selectedTags,
  selectedAccessibility,
  relatedEvents,
  relatedGuestCounts,
  setExplorerView,
  setSortBy,
  setQuickFilters,
  setSelectedDateStart,
  setSelectedDateEnd,
  setSelectedLocation,
  setSelectedOrganizer,
  setSelectedFormat,
  setSelectedPrice,
  setSelectedTags,
  setSelectedAccessibility,
  resetFilters,
}: EventExplorerProps) {
  const shortDateFormatter = createShortDateFormatter();
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Memoized computed values
  const relatedEventsWithCounts = relatedEvents.map((related) => ({
    ...related,
    rsvpCount: relatedGuestCounts[related.id] ?? 0,
  }));

  const highCapacityThreshold = (() => {
    const counts = relatedEventsWithCounts
      .map((related) => related.guestCount)
      .filter((count) => count > 0)
      .sort((a, b) => a - b);
    if (counts.length === 0) {
      return 0;
    }
    const index = Math.floor(counts.length * 0.75);
    return counts[index] ?? counts.at(-1) ?? 0;
  })();

  const locationOptions = (() => {
    const locations = new Set<string>();
    let hasUnassigned = false;

    for (const related of relatedEventsWithCounts) {
      if (related.venueAddress?.trim()) {
        locations.add(related.venueAddress.trim());
      } else {
        hasUnassigned = true;
      }
    }

    return { locations: Array.from(locations).sort(), hasUnassigned };
  })();

  const organizerOptions = (() => {
    const organizers = new Set<string>();
    let hasUnassigned = false;

    for (const related of relatedEventsWithCounts) {
      if (related.venueName?.trim()) {
        organizers.add(related.venueName.trim());
      } else {
        hasUnassigned = true;
      }
    }

    return { organizers: Array.from(organizers).sort(), hasUnassigned };
  })();

  const tagOptions = (() => {
    const tags = new Set<string>();
    for (const related of relatedEventsWithCounts) {
      for (const tag of related.tags) {
        if (!tag.startsWith("needs:")) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags).sort();
  })();

  const accessibilityOptions = (() => {
    const options = new Set<string>();
    for (const related of relatedEventsWithCounts) {
      for (const option of related.accessibilityOptions) {
        options.add(option);
      }
    }
    return Array.from(options).sort();
  })();

  const filterStart = selectedDateStart
    ? new Date(`${selectedDateStart}T00:00:00`)
    : null;
  const filterEnd = selectedDateEnd
    ? new Date(`${selectedDateEnd}T00:00:00`)
    : null;

  const dateRangeInvalid =
    filterStart && filterEnd ? filterEnd < filterStart : false;

  const filteredRelatedEvents = relatedEventsWithCounts.filter((related) => {
    const relatedDate = new Date(related.eventDate);
    if (filterStart && relatedDate < filterStart) {
      return false;
    }
    if (filterEnd && relatedDate > endOfDay(filterEnd)) {
      return false;
    }
    if (selectedLocation !== "all") {
      if (selectedLocation === "unassigned") {
        if (related.venueAddress?.trim()) {
          return false;
        }
      } else if ((related.venueAddress ?? "").trim() !== selectedLocation) {
        return false;
      }
    }
    if (selectedOrganizer !== "all") {
      if (selectedOrganizer === "unassigned") {
        if (related.venueName?.trim()) {
          return false;
        }
      } else if ((related.venueName ?? "").trim() !== selectedOrganizer) {
        return false;
      }
    }
    if (selectedFormat !== "all" && related.eventFormat !== selectedFormat) {
      return false;
    }
    if (
      selectedPrice === "free" &&
      (related.ticketPrice === null || related.ticketPrice > 0)
    ) {
      return false;
    }
    if (
      selectedPrice === "paid" &&
      (related.ticketPrice === null || related.ticketPrice <= 0)
    ) {
      return false;
    }
    if (selectedTags.length > 0) {
      const hasTag = selectedTags.some((tag) => related.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }
    if (selectedAccessibility.length > 0) {
      const hasAccess = selectedAccessibility.some((option) =>
        related.accessibilityOptions.includes(option)
      );
      if (!hasAccess) {
        return false;
      }
    }

    const relatedStart = startOfDay(new Date(related.eventDate));
    const relatedEnd = endOfDay(new Date(related.eventDate));
    const isRelatedLive = now >= relatedStart && now <= relatedEnd;
    const isRelatedStartingSoon =
      relatedStart > now && relatedStart <= addDays(now, 7);
    const isRelatedSoldOut =
      related.guestCount > 0 && related.rsvpCount >= related.guestCount;
    const isRelatedHighCapacity =
      highCapacityThreshold > 0 && related.guestCount >= highCapacityThreshold;

    if (quickFilters.includes("live-now") && !isRelatedLive) {
      return false;
    }
    if (quickFilters.includes("starting-soon") && !isRelatedStartingSoon) {
      return false;
    }
    if (quickFilters.includes("sold-out") && !isRelatedSoldOut) {
      return false;
    }
    if (quickFilters.includes("high-capacity") && !isRelatedHighCapacity) {
      return false;
    }
    if (
      quickFilters.includes("free") &&
      !(related.ticketPrice !== null && related.ticketPrice <= 0)
    ) {
      return false;
    }
    if (
      quickFilters.includes("paid") &&
      !(related.ticketPrice !== null && related.ticketPrice > 0)
    ) {
      return false;
    }

    return true;
  });

  const sortedRelatedEvents = (() => {
    const data = [...filteredRelatedEvents];

    if (sortBy === "soonest") {
      return data.sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );
    }

    if (sortBy === "popularity") {
      return data.sort((a, b) => b.rsvpCount - a.rsvpCount);
    }

    if (sortBy === "price") {
      return data.sort((a, b) => {
        const priceA = a.ticketPrice ?? Number.POSITIVE_INFINITY;
        const priceB = b.ticketPrice ?? Number.POSITIVE_INFINITY;
        return priceA - priceB;
      });
    }

    return data.sort((a, b) => {
      const aStart = startOfDay(new Date(a.eventDate));
      const bStart = startOfDay(new Date(b.eventDate));
      const aLive = now >= aStart && now <= endOfDay(new Date(a.eventDate));
      const bLive = now >= bStart && now <= endOfDay(new Date(b.eventDate));
      if (aLive && !bLive) {
        return -1;
      }
      if (!aLive && bLive) {
        return 1;
      }
      return aStart.getTime() - bStart.getTime();
    });
  })();

  const featuredEvents = sortedRelatedEvents.slice(0, 13);

  const todayEvents = sortedRelatedEvents.filter((related) => {
    const relatedDate = new Date(related.eventDate);
    return startOfDay(relatedDate).getTime() === startOfDay(now).getTime();
  });

  const thisWeekEvents = sortedRelatedEvents.filter((related) => {
    const relatedDate = new Date(related.eventDate);
    return (
      relatedDate >= startOfDay(now) &&
      relatedDate <= addDays(startOfDay(now), 7)
    );
  });

  const todayKey = createCalendarDateFormatter().format(now);
  const highCapacityLabel =
    highCapacityThreshold > 0
      ? `High capacity (${highCapacityThreshold}+ guests)`
      : "High capacity";

  const timelineGroups = (() => {
    const groups = new Map<string, typeof sortedRelatedEvents>();
    for (const related of sortedRelatedEvents) {
      const key = createCalendarDateFormatter().format(
        new Date(related.eventDate)
      );
      const existing = groups.get(key);
      if (existing) {
        existing.push(related);
      } else {
        groups.set(key, [related]);
      }
    }

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        date: new Date(items[0]?.eventDate ?? new Date()),
        items: items.sort(
          (a, b) =>
            new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        ),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  })();

  const hasActiveFilters =
    quickFilters.length > 0 ||
    selectedDateStart.length > 0 ||
    selectedDateEnd.length > 0 ||
    selectedLocation !== "all" ||
    selectedOrganizer !== "all" ||
    selectedFormat !== "all" ||
    selectedPrice !== "all" ||
    selectedTags.length > 0 ||
    selectedAccessibility.length > 0;

  const toggleQuickFilter = (filter: QuickFilter) => {
    setQuickFilters(
      quickFilters.includes(filter)
        ? quickFilters.filter((value: QuickFilter) => value !== filter)
        : [...quickFilters, filter]
    );
  };

  const FiltersPanel = ({ className }: { className?: string }) => (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-2">
        <Label htmlFor="explorer-start">Start date</Label>
        <Input
          id="explorer-start"
          onChange={(eventInput) =>
            setSelectedDateStart(eventInput.target.value)
          }
          type="date"
          value={selectedDateStart}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="explorer-end">End date</Label>
        <Input
          id="explorer-end"
          onChange={(eventInput) => setSelectedDateEnd(eventInput.target.value)}
          type="date"
          value={selectedDateEnd}
        />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Select onValueChange={setSelectedLocation} value={selectedLocation}>
          <SelectTrigger>
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locationOptions.locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
            {locationOptions.hasUnassigned && (
              <SelectItem value="unassigned">Location not set</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Organizer</Label>
        <Select onValueChange={setSelectedOrganizer} value={selectedOrganizer}>
          <SelectTrigger>
            <SelectValue placeholder="All organizers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizers</SelectItem>
            {organizerOptions.organizers.map((organizer) => (
              <SelectItem key={organizer} value={organizer}>
                {organizer}
              </SelectItem>
            ))}
            {organizerOptions.hasUnassigned && (
              <SelectItem value="unassigned">Organizer not set</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Format</Label>
        <Select onValueChange={setSelectedFormat} value={selectedFormat}>
          <SelectTrigger>
            <SelectValue placeholder="All formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            <SelectItem value="in_person">In-person</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Price</Label>
        <Select onValueChange={setSelectedPrice} value={selectedPrice}>
          <SelectTrigger>
            <SelectValue placeholder="All prices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
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
              <TagIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            {tagOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tags available.
              </p>
            ) : (
              <div className="space-y-2">
                {tagOptions.map((tag) => (
                  <label className="flex items-center gap-2 text-sm" key={tag}>
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => {
                        setSelectedTags(
                          selectedTags.includes(tag)
                            ? selectedTags.filter(
                                (value: string) => value !== tag
                              )
                            : [...selectedTags, tag]
                        );
                      }}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label>Accessibility</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button className="w-full justify-between" variant="outline">
              {selectedAccessibility.length > 0
                ? `${selectedAccessibility.length} option${selectedAccessibility.length > 1 ? "s" : ""}`
                : "Choose options"}
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            {accessibilityOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No accessibility options listed.
              </p>
            ) : (
              <div className="space-y-2">
                {accessibilityOptions.map((option) => (
                  <label
                    className="flex items-center gap-2 text-sm"
                    key={option}
                  >
                    <Checkbox
                      checked={selectedAccessibility.includes(option)}
                      onCheckedChange={() => {
                        setSelectedAccessibility(
                          selectedAccessibility.includes(option)
                            ? selectedAccessibility.filter(
                                (value: string) => value !== option
                              )
                            : [...selectedAccessibility, option]
                        );
                      }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filteredRelatedEvents.length} events matched
        </span>
        <Button
          disabled={!hasActiveFilters}
          onClick={resetFilters}
          size="sm"
          variant="ghost"
        >
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <section className="space-y-6" id="explore">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Event explorer
          </p>
          <h2 className="text-2xl font-semibold">Schedule + browse</h2>
          <p className="text-sm text-muted-foreground">
            Editorial overview for high-volume event browsing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            className="rounded-full border border-border/70 bg-muted/40"
            onValueChange={(value) => {
              if (value) {
                setExplorerView(value as ExplorerView);
              }
            }}
            type="single"
            value={explorerView}
          >
            <ToggleGroupItem className="gap-2" value="grid">
              <LayoutGridIcon className="size-4" />
              Grid
            </ToggleGroupItem>
            <ToggleGroupItem className="gap-2" value="calendar">
              <ListIcon className="size-4" />
              Timeline
            </ToggleGroupItem>
          </ToggleGroup>
          <Select
            onValueChange={(value) => setSortBy(value as SortOption)}
            value={sortBy}
          >
            <SelectTrigger className="w-[160px] border-border/70 bg-muted/40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="soonest">Soonest</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>
          <Sheet onOpenChange={() => {}} open={false}>
            <SheetTrigger asChild>
              <Button className="lg:hidden" variant="outline">
                <FilterIcon className="mr-2 size-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent
              className="border-border bg-muted text-foreground"
              side="left"
            >
              <SheetHeader>
                <SheetTitle className="text-foreground">Filters</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">
                <FiltersPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="sticky top-6 hidden self-start lg:block">
          <Card className="border-border/60 bg-card/70 text-foreground">
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription className="text-muted-foreground">
                Refine by date, venue, tags, and accessibility.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FiltersPanel />
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => toggleQuickFilter("live-now")}
              size="sm"
              variant={
                quickFilters.includes("live-now") ? "default" : "outline"
              }
            >
              <ActivityIcon className="mr-2 size-3" />
              Live now
            </Button>
            <Button
              onClick={() => toggleQuickFilter("starting-soon")}
              size="sm"
              variant={
                quickFilters.includes("starting-soon") ? "default" : "outline"
              }
            >
              <AlarmClockIcon className="mr-2 size-3" />
              Starting soon
            </Button>
            <Button
              onClick={() => toggleQuickFilter("high-capacity")}
              size="sm"
              variant={
                quickFilters.includes("high-capacity") ? "default" : "outline"
              }
            >
              <UsersIcon className="mr-2 size-3" />
              {highCapacityLabel}
            </Button>
            <Button
              onClick={() => toggleQuickFilter("sold-out")}
              size="sm"
              variant={
                quickFilters.includes("sold-out") ? "default" : "outline"
              }
            >
              <TicketIcon className="mr-2 size-3" />
              Sold out
            </Button>
            <Button
              onClick={() => toggleQuickFilter("free")}
              size="sm"
              variant={quickFilters.includes("free") ? "default" : "outline"}
            >
              Free
            </Button>
            <Button
              onClick={() => toggleQuickFilter("paid")}
              size="sm"
              variant={quickFilters.includes("paid") ? "default" : "outline"}
            >
              Paid
            </Button>
            {hasActiveFilters && (
              <Button onClick={resetFilters} size="sm" variant="ghost">
                Clear all
              </Button>
            )}
          </div>

          <div className="rounded-3xl border border-border/60 bg-card/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Featured
                </p>
                <h3 className="text-xl font-semibold">13 featured events</h3>
              </div>
              <Badge
                className="border-border/70 bg-muted/40 text-foreground"
                variant="outline"
              >
                {featuredEvents.length} featured
              </Badge>
            </div>
            {featuredEvents.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No featured events available yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {featuredEvents.map((related, index) => (
                  <Link
                    className="group overflow-hidden rounded-2xl border border-border/70 bg-muted/40 transition hover:-translate-y-0.5 hover:border-success/50"
                    href={`/events/${related.id}`}
                    key={related.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative h-28 overflow-hidden">
                      {related.featuredMediaUrl ? (
                        <img
                          alt={related.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          src={related.featuredMediaUrl}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-card to-muted text-foreground/60">
                          <CrownIcon className="size-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-muted/70 via-transparent to-transparent" />
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {shortDateFormatter.format(
                            new Date(related.eventDate)
                          )}
                        </span>
                        <span>{related.eventType}</span>
                      </div>
                      <p className="text-sm font-semibold">{related.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {related.venueName ?? "Venue TBD"}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-success">
                        <ShieldCheckIcon className="size-3" />
                        Verified venue
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/60 bg-card/70 text-foreground">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TimerIcon className="size-4 text-success" />
                  Today&apos;s spotlight
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {todayEvents.length} event
                  {todayEvents.length === 1 ? "" : "s"} today.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events scheduled for today.
                  </p>
                ) : (
                  todayEvents.slice(0, 3).map((related) => (
                    <Link
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm transition hover:border-success/40"
                      href={`/events/${related.id}`}
                      key={related.id}
                    >
                      <div>
                        <p className="font-semibold">{related.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {related.venueName ?? "Venue TBD"}
                        </p>
                      </div>
                      <Badge
                        className="border-border/70 bg-card/70 text-foreground"
                        variant="outline"
                      >
                        {related.rsvpCount}/{related.guestCount || 0} RSVPs
                      </Badge>
                    </Link>
                  ))
                )}
                <Button
                  onClick={() => {
                    setSelectedDateStart(todayKey);
                    setSelectedDateEnd(todayKey);
                  }}
                  size="sm"
                  variant="outline"
                >
                  Focus today
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70 text-foreground">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDaysIcon className="size-4 text-info" />
                  This week
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {thisWeekEvents.length} event
                  {thisWeekEvents.length === 1 ? "" : "s"} in the next 7 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {thisWeekEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events scheduled this week.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {thisWeekEvents.slice(0, 8).map((related) => (
                      <Link
                        className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-foreground transition hover:border-success/40"
                        href={`/events/${related.id}`}
                        key={related.id}
                      >
                        {shortDateFormatter.format(new Date(related.eventDate))}{" "}
                        • {related.title}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {dateRangeInvalid && (
            <Card className="border-destructive/40 bg-destructive/10 text-destructive">
              <CardContent className="py-6 text-sm">
                End date must be after the start date. Adjust your range or
                reset filters.
              </CardContent>
            </Card>
          )}
          {sortedRelatedEvents.length === 0 ? (
            <Card className="border-border/60 bg-card/70 text-foreground">
              <CardContent className="py-10 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted/60">
                  <Globe2Icon className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground">
                  {hasActiveFilters
                    ? "No events match the current filters."
                    : "No events available yet."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Try resetting filters or browse all events.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    disabled={!hasActiveFilters}
                    onClick={resetFilters}
                    size="sm"
                    variant="outline"
                  >
                    Reset filters
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/events">View all events</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : explorerView === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedRelatedEvents.map((related, index) => {
                const relatedDate = new Date(related.eventDate);
                const relatedStart = startOfDay(relatedDate);
                const relatedEnd = endOfDay(relatedDate);
                const relatedLive = now >= relatedStart && now <= relatedEnd;
                const relatedPast = now > relatedEnd;
                const relatedUpcoming = now < relatedStart;
                const relatedSoldOut =
                  related.guestCount > 0 &&
                  related.rsvpCount >= related.guestCount;
                const relatedLimited =
                  related.guestCount > 0 &&
                  !relatedSoldOut &&
                  related.rsvpCount / related.guestCount >= 0.85;
                const relatedTimeUntil = relatedStart.getTime() - now.getTime();
                const relatedTimeSince = now.getTime() - relatedStart.getTime();

                return (
                  <Link
                    className="group rounded-2xl border border-border/70 bg-muted/40 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-success/50"
                    href={`/events/${related.id}`}
                    key={related.id}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        className={cn(
                          "border text-[11px]",
                          relatedLive
                            ? "border-success/40 bg-success/20 text-success"
                            : relatedPast
                              ? "border-slate-500/40 bg-slate-500/10 text-foreground"
                              : "border-info/40 bg-info/10 text-info"
                        )}
                        variant="outline"
                      >
                        {relatedLive
                          ? "Live"
                          : relatedPast
                            ? "Past"
                            : "Upcoming"}
                      </Badge>
                      {relatedSoldOut && (
                        <Badge
                          className="border-destructive/40 bg-destructive/20 text-destructive"
                          variant="outline"
                        >
                          Sold out
                        </Badge>
                      )}
                      {!relatedSoldOut && relatedLimited && (
                        <Badge
                          className="border-warning/40 bg-warning/20 text-warning"
                          variant="outline"
                        >
                          Limited
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-lg font-semibold">{related.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {shortDateFormatter.format(relatedDate)} •{" "}
                        {related.venueName ?? "Venue TBD"}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{related.eventType}</span>
                      <span>
                        {related.ticketPrice === null
                          ? "Ticketing not set"
                          : related.ticketPrice <= 0
                            ? "Free"
                            : formatCurrency(related.ticketPrice)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <UsersIcon className="size-3" />
                      {related.rsvpCount}/{related.guestCount || 0} RSVPs
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {related.tags.slice(0, 3).map((tag) => (
                        <Badge
                          className="border-border/70 bg-card/70 text-foreground"
                          key={tag}
                          variant="outline"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      <div className="flex items-center gap-2">
                        <TimerIcon className="size-3" />
                        {relatedLive
                          ? `Live for ${formatDuration(relatedTimeSince)}`
                          : relatedUpcoming
                            ? `Starts in ${formatDuration(relatedTimeUntil)}`
                            : "Completed"}
                      </div>
                      <div className="flex items-center gap-1 text-success">
                        <ShieldCheckIcon className="size-3" />
                        Verified venue
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {timelineGroups.map((group) => (
                <div
                  className="rounded-2xl border border-border/70 bg-muted/40 p-4"
                  key={group.key}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {dateFormatter.format(group.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.items.length} events
                      </p>
                    </div>
                    <Badge
                      className="border-border/70 bg-card/70 text-foreground"
                      variant="outline"
                    >
                      {shortDateFormatter.format(group.date)}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {group.items.map((related) => {
                      const relatedDate = new Date(related.eventDate);
                      const relatedStart = startOfDay(relatedDate);
                      const relatedEnd = endOfDay(relatedDate);
                      const relatedLive =
                        now >= relatedStart && now <= relatedEnd;
                      const relatedPast = now > relatedEnd;
                      const relatedSoldOut =
                        related.guestCount > 0 &&
                        related.rsvpCount >= related.guestCount;
                      return (
                        <Link
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-sm transition hover:border-success/40"
                          href={`/events/${related.id}`}
                          key={related.id}
                        >
                          <div className="space-y-1">
                            <p className="font-semibold">{related.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {related.venueName ?? "Venue TBD"} •{" "}
                              {related.eventType}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge
                              className={cn(
                                "border text-[11px]",
                                relatedLive
                                  ? "border-success/40 bg-success/20 text-success"
                                  : relatedPast
                                    ? "border-slate-500/40 bg-slate-500/10 text-foreground"
                                    : "border-info/40 bg-info/10 text-info"
                              )}
                              variant="outline"
                            >
                              {relatedLive
                                ? "Live"
                                : relatedPast
                                  ? "Past"
                                  : "Upcoming"}
                            </Badge>
                            {relatedSoldOut && (
                              <Badge
                                className="border-destructive/40 bg-destructive/20 text-destructive"
                                variant="outline"
                              >
                                Sold out
                              </Badge>
                            )}
                            <span>
                              {related.rsvpCount}/{related.guestCount || 0}{" "}
                              RSVPs
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
