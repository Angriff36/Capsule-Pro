"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { BlogFilterChip } from "@repo/design-system/components/blocks/blog-filter-chip";
import { ResearchTable } from "@repo/design-system/components/blocks/research-table";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  GripVertical,
  MapPin,
  PartyPopper,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { log } from "@repo/observability/log";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: "event" | "shift" | "timeoff";
  status?: string;
  color?: string;
  details?: string;
  location?: string;
  assignedTo?: string;
  guestCount?: number;
}

interface UnifiedCalendarProps {
  tenantId: string;
  initialEvents?: CalendarEvent[];
  initialShifts?: unknown[];
  initialTimeOff?: unknown[];
  initialDate?: Date;
}

// Tokenized color scheme for calendar entry types (FR-103)
const EVENT_COLORS: Record<string, string> = {
  event: "bg-[var(--ds-calendar-event)] border-[var(--ds-calendar-event)]",
  shift: "bg-[var(--ds-calendar-shift)] border-[var(--ds-calendar-shift)]",
  timeoff: "bg-[var(--ds-calendar-timeoff)] border-[var(--ds-calendar-timeoff)]",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  event: "Events",
  shift: "Shifts",
  timeoff: "Time Off",
};

// Event types that can be rescheduled via drag-and-drop
const DRAGGABLE_EVENT_TYPES = ["event", "shift"];

// Draggable event card wrapper
interface DraggableEventProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  isDayView?: boolean;
}

function DraggableEvent({ event, onClick, isDayView }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event-${event.id}`,
    data: { event },
  });

  const isDraggable = DRAGGABLE_EVENT_TYPES.includes(event.type);

  if (!isDraggable) {
    // Non-draggable events (timeoff)
    return (
      <button
        className={`
          px-2 py-1 rounded text-xs cursor-pointer truncate
          ${EVENT_COLORS[event.type] || "bg-gray-500"}
          text-white
          ${isDayView ? "py-2 text-sm" : ""}
        `}
        onClick={() => onClick(event)}
        title={event.title}
        type="button"
      >
        {format(event.start, "HH:mm")} {event.title}
      </button>
    );
  }

  return (
    <button
      className={`
          px-2 py-1 rounded text-xs cursor-grab truncate
        ${EVENT_COLORS[event.type] || "bg-gray-500"}
        text-white
        ${isDayView ? "py-2 text-sm" : ""}
        ${isDragging ? "opacity-50 ring-2 ring-[var(--ds-calendar-event)]" : "hover:opacity-90"}
      `}
      onClick={() => onClick(event)}
      ref={setNodeRef}
      title={`${event.title} - Drag to reschedule`}
      type="button"
      {...attributes}
      {...listeners}
    >
      <span className="flex items-center gap-1">
        <GripVertical className="w-3 h-3 opacity-60 flex-shrink-0" />
        {format(event.start, "HH:mm")} {event.title}
      </span>
    </button>
  );
}

// Droppable day cell wrapper
interface DroppableDayCellProps {
  day: Date;
  isCurrentMonth: boolean;
  isCurrentDay: boolean;
  view: "month" | "week" | "day";
  children: React.ReactNode;
  activeEvent: CalendarEvent | null;
}

function DroppableDayCell({
  day,
  isCurrentMonth,
  isCurrentDay,
  view,
  children,
  activeEvent,
}: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.toISOString()}`,
    data: { date: day },
  });

  const isActiveTarget = activeEvent && isOver;

  return (
    <div
      className={`
        border rounded-lg transition-colors
        ${view === "day" ? "min-h-[500px] p-4" : "min-h-[120px] p-2"}
        ${isCurrentMonth ? "bg-white" : "bg-muted/20"}
        ${isCurrentDay ? "ring-2 ring-[var(--ds-calendar-shift)]" : "border-hairline"}
        ${isActiveTarget ? "ring-2 ring-[var(--ds-calendar-event)] bg-muted/20" : ""}
        hover:border-hairline
      `}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}

export function UnifiedCalendar({
  tenantId: _tenantId,
  initialEvents = [],
  initialShifts: _initialShifts = [],
  initialTimeOff: _initialTimeOff = [],
  initialDate,
}: UnifiedCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params or defaults
  const urlView = searchParams?.get("view");
  const urlDate = searchParams?.get("date");
  const urlTypes = searchParams?.get("types");

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (urlDate) {
      const parsed = new Date(urlDate);
      return Number.isNaN(parsed.getTime()) ? (initialDate ?? new Date()) : parsed;
    }
    return initialDate ?? new Date();
  });
  const [view, setView] = useState<"month" | "week" | "day">(() => {
    if (urlView === "week" || urlView === "day") return urlView;
    return "month";
  });
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [overflowDialog, setOverflowDialog] = useState<{
    open: boolean;
    date: Date | null;
    events: CalendarEvent[];
  }>({ open: false, date: null, events: [] });
  const [filters, setFilters] = useState<string[]>(() => {
    if (urlTypes) {
      const parsed = urlTypes.split(",").filter((t) => ["event", "shift", "timeoff"].includes(t));
      return parsed.length > 0 ? parsed : ["event", "shift", "timeoff"];
    }
    return ["event", "shift", "timeoff"];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [_isLoading, setIsLoading] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState<string>("");
  const [availabilityResults, setAvailabilityResults] = useState<
    CalendarEvent[] | null
  >(null);

  // Drag-and-drop state
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    event: CalendarEvent | null;
    newDate: Date | null;
  }>({ open: false, event: null, newDate: null });
  const [isRescheduling, setIsRescheduling] = useState(false);

  // DnD sensors — PointerSensor for mouse, TouchSensor with 350ms long-press (FR-702)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 350,
        tolerance: 5,
      },
    })
  );

  // Sync view/date/types to URL query params
  const syncUrlParams = useCallback(
    (newView: string, newDate: Date, newFilters: string[]) => {
      const params = new URLSearchParams();
      if (newView !== "month") params.set("view", newView);
      const today = new Date();
      if (!isSameDay(newDate, today)) {
        params.set("date", format(newDate, "yyyy-MM-dd"));
      }
      const defaultTypes = ["event", "shift", "timeoff"];
      if (newFilters.length < 3 || newFilters.some((f) => !defaultTypes.includes(f))) {
        params.set("types", newFilters.join(","));
      }
      const qs = params.toString();
      router.replace(`/calendar${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  // Fetch calendar data
  useEffect(() => {
    async function fetchCalendarData() {
      setIsLoading(true);
      try {
        const start = startOfMonth(subMonths(currentDate, 1));
        const end = endOfMonth(addMonths(currentDate, 1));

        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
          types: filters.join(","),
        });

        const response = await apiFetch(`/api/calendar?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        log.error("Failed to fetch calendar data:", { error });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCalendarData();
  }, [currentDate, filters]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesFilter = filters.includes(event.type);
      const matchesSearch =
        !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.details?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [events, filters, searchQuery]);

  // Get events for a specific day (includes cross-day shifts/timeoff spanning midnight)
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter((event) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const eventStart = event.start;

      // Event starts on this day
      if (isSameDay(eventStart, day)) return true;

      // Cross-day: event started before this day and (has no end, or ends on/after this day)
      if (event.end) {
        const eventEndDate = new Date(event.end);
        return eventStart < dayStart && eventEndDate >= dayStart;
      }

      return false;
    });
  };

  // Navigation
  const nextPeriod = () => {
    let next: Date;
    if (view === "month") {
      next = addMonths(currentDate, 1);
    } else if (view === "week") {
      next = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      next = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    setCurrentDate(next);
    syncUrlParams(view, next, filters);
  };

  const prevPeriod = () => {
    let prev: Date;
    if (view === "month") {
      prev = subMonths(currentDate, 1);
    } else if (view === "week") {
      prev = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      prev = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    }
    setCurrentDate(prev);
    syncUrlParams(view, prev, filters);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    syncUrlParams(view, today, filters);
  };

  const changeView = (newView: "month" | "week" | "day") => {
    setView(newView);
    syncUrlParams(newView, currentDate, filters);
  };

  const openSelectedEventDetails = () => {
    if (!selectedEvent || selectedEvent.type !== "event") {
      return;
    }

    setShowEventDialog(false);
    router.push(`/events/${selectedEvent.id}`);
  };

  // Generate calendar days based on view
  const calendarDays = useMemo(() => {
    if (view === "day") {
      // Single day view
      return [currentDate];
    }

    if (view === "week") {
      // Week view: 7 days starting from Sunday
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }

    // Month view (default)
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate, view]);

  // Check availability for a specific date
  const checkAvailability = (dateStr: string) => {
    setAvailabilityDate(dateStr);
    if (!dateStr) {
      setAvailabilityResults(null);
      return;
    }

    try {
      const checkDate = parseISO(dateStr);
      if (!isValid(checkDate)) {
        setAvailabilityResults(null);
        return;
      }

      const dayEvents = events.filter((event) =>
        isSameDay(event.start, checkDate)
      );
      setAvailabilityResults(dayEvents);
    } catch {
      setAvailabilityResults(null);
    }
  };

  // Get availability status
  const getAvailabilityStatus = () => {
    if (!availabilityResults) {
      return null;
    }

    const hasEvents = availabilityResults.filter(
      (e) => e.type === "event"
    ).length;
    const hasShifts = availabilityResults.filter(
      (e) => e.type === "shift"
    ).length;
    const hasTimeOff = availabilityResults.filter(
      (e) => e.type === "timeoff"
    ).length;

    if (availabilityResults.length === 0) {
      return {
        status: "available",
        label: "Fully Available",
        color: "text-emerald-500",
        icon: CheckCircle2,
      };
    }
    if (hasTimeOff > 0 && hasShifts === 0) {
      return {
        status: "blocked",
        label: "Blocked - Time Off",
        color: "text-red-500",
        icon: XCircle,
      };
    }
    if (hasEvents > 0 || hasShifts > 0) {
      return {
        status: "busy",
        label: `${availabilityResults.length} items scheduled`,
        color: "text-amber-500",
        icon: AlertCircle,
      };
    }
    return {
      status: "available",
      label: "Available",
      color: "text-emerald-500",
      icon: CheckCircle2,
    };
  };

  const availabilityStatus = getAvailabilityStatus();
  let availabilityStatusBackground = "bg-[var(--ds-calendar-timeoff-light)]";
  if (availabilityStatus?.status === "available") {
    availabilityStatusBackground = "bg-[var(--ds-calendar-shift-light)]";
  } else if (availabilityStatus?.status === "busy") {
    availabilityStatusBackground = "bg-[var(--ds-calendar-timeoff-light)]";
  }
  const calendarGridColumnsClass =
    view === "day" ? "grid-cols-1" : "grid-cols-7";

  // Toggle filter
  const toggleFilter = (filter: string) => {
    const next = filters.includes(filter)
      ? filters.filter((f) => f !== filter)
      : [...filters, filter];
    setFilters(next);
    syncUrlParams(view, currentDate, next);
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  // Drag-and-drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const draggedEvent = event.active.data.current?.event as CalendarEvent;
    if (draggedEvent) {
      setActiveEvent(draggedEvent);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!(over && active)) {
      return;
    }

    const draggedEvent = active.data.current?.event as CalendarEvent;
    const targetDate = over.data.current?.date as Date;

    if (!(draggedEvent && targetDate)) {
      return;
    }

    // Don't show dialog if dropped on same day
    if (isSameDay(draggedEvent.start, targetDate)) {
      return;
    }

    // Show confirmation dialog
    setRescheduleDialog({
      open: true,
      event: draggedEvent,
      newDate: targetDate,
    });
  };

  const handleDragCancel = () => {
    setActiveEvent(null);
  };

  // Reschedule event via API
  const handleConfirmReschedule = async () => {
    const { event: dragEvent, newDate } = rescheduleDialog;
    if (!(dragEvent && newDate)) {
      return;
    }

    // Only events and shifts are reschedulable
    if (dragEvent.type !== "event" && dragEvent.type !== "shift") {
      return;
    }

    setIsRescheduling(true);
    try {
      // Preserve the original time from the event
      const originalHours = dragEvent.start.getHours();
      const originalMinutes = dragEvent.start.getMinutes();
      const newEventDate = setMinutes(
        setHours(startOfDay(newDate), originalHours),
        originalMinutes
      );

      const response = await apiFetch("/api/calendar/reschedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: dragEvent.id,
          eventType: dragEvent.type,
          newDate: newEventDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reschedule");
      }

      // Update local state optimistically
      setEvents((prev) =>
        prev.map((e) =>
          e.id === dragEvent.id ? { ...e, start: newEventDate } : e
        )
      );

      toast.success(
        `"${dragEvent.title}" rescheduled to ${format(newEventDate, "MMM d, yyyy")}`
      );
      setRescheduleDialog({ open: false, event: null, newDate: null });
    } catch (error) {
      log.error("Failed to reschedule:", { error });
      toast.error(
        error instanceof Error ? error.message : "Failed to reschedule"
      );
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button onClick={prevPeriod} size="icon" variant="ghost">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button onClick={nextPeriod} size="icon" variant="ghost">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button onClick={goToToday} size="sm" variant="outline">
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <BlogFilterChip
            onSelect={() => changeView("month")}
            selected={view === "month"}
          >
            Month
          </BlogFilterChip>
          <BlogFilterChip
            onSelect={() => changeView("week")}
            selected={view === "week"}
          >
            Week
          </BlogFilterChip>
          <BlogFilterChip
            onSelect={() => changeView("day")}
            selected={view === "day"}
          >
            Day
          </BlogFilterChip>
        </div>
      </div>

      {/* Check Availability Bar */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium text-foreground">
            Check Availability:
          </span>
        </div>
        <div className="flex items-center gap-3">
          <DatePicker
            className="w-48"
            onChange={(e) => checkAvailability(e.target.value)}
            placeholder="Select date..."
 
            value={availabilityDate}
          />
          {availabilityStatus && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${availabilityStatusBackground}`}
            >
              <availabilityStatus.icon
                className={`w-4 h-4 ${availabilityStatus.color}`}
              />
              <span
                className={`text-sm font-medium ${availabilityStatus.color}`}
              >
                {availabilityStatus.label}
              </span>
            </div>
          )}
          {availabilityResults && availabilityResults.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Scheduled:</span>
              {availabilityResults.slice(0, 3).map((event) => (
                <Badge
                  className="text-xs"
                  key={`${event.id}-${event.start.toISOString()}`}
                  variant="outline"
                >
                  {event.title}
                </Badge>
              ))}
              {availabilityResults.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{availabilityResults.length - 3} more
                </span>
              )}
            </div>
          )}
          {availabilityDate && (
            <Button
              onClick={() => {
                setAvailabilityDate("");
                setAvailabilityResults(null);
              }}
              size="sm"
              variant="ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
            <Badge
              className={`cursor-pointer ${filters.includes(type) ? EVENT_COLORS[type].replace("bg-", "bg-").replace("border-", "border-") : ""}`}
              key={type}
              onClick={() => toggleFilter(type)}
              variant={filters.includes(type) ? "default" : "outline"}
            >
              {label}
            </Badge>
          ))}
        </div>
        <div className="ml-auto">
          <Input
            className="w-64"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        <DndContext
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          {/* Day Headers */}
          <div
            className={`grid gap-1 mb-2 ${view === "day" ? "grid-cols-1" : "grid-cols-7"}`}
          >
            {view === "day" ? (
              <div className="text-center text-sm font-medium text-gray-500 py-2">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </div>
            ) : (
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  className="text-center text-sm font-medium text-gray-500 py-2"
                  key={day}
                >
                  {day}
                </div>
              ))
            )}
          </div>

          {/* Calendar Days */}
          <div
            className={`grid auto-rows-fr gap-1 min-h-[600px] ${calendarGridColumnsClass}`}
          >
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth =
                view === "week" ||
                view === "day" ||
                isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <DroppableDayCell
                  activeEvent={activeEvent}
                  day={day}
                  isCurrentDay={isCurrentDay}
                  isCurrentMonth={isCurrentMonth}
                  key={day.toISOString()}
                  view={view}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                      text-sm font-medium
                      ${isCurrentDay ? "bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center" : ""}
                      ${isCurrentMonth ? "text-gray-700" : "text-gray-400"}
                    `}
                    >
                      {view === "day"
                        ? format(day, "EEEE, MMMM d")
                        : format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div
                    className={`space-y-1 overflow-y-auto ${view === "day" ? "max-h-[400px]" : "max-h-[90px]"}`}
                  >
                    {dayEvents
                      .slice(0, view === "day" ? 50 : view === "week" ? 8 : 4)
                      .map((event) => (
                        <DraggableEvent
                          event={event}
                          isDayView={view === "day"}
                          key={`${event.id}-${day.toISOString()}`}
                          onClick={handleEventClick}
                        />
                      ))}
                    {dayEvents.length > (view === "day" ? 50 : view === "week" ? 8 : 4) && (
                      <button
                        className="text-xs text-ink/60 pl-1 underline-offset-2 hover:underline hover:text-ink"
                        onClick={() =>
                          setOverflowDialog({
                            open: true,
                            date: day,
                            events: dayEvents,
                          })
                        }
                        type="button"
                      >
                        +{dayEvents.length - (view === "day" ? 50 : view === "week" ? 8 : 4)} more
                      </button>
                    )}
                  </div>
                </DroppableDayCell>
              );
            })}
          </div>

          {/* Drag Overlay - shows event being dragged */}
          <DragOverlay>
            {activeEvent ? (
              <div
                className={`
                  px-2 py-1 rounded text-xs truncate border border-hairline
                  ${EVENT_COLORS[activeEvent.type] || "bg-gray-500"}
                  text-white
                  ring-2 ring-[var(--ds-calendar-event)]
                `}
              >
                {format(activeEvent.start, "HH:mm")} {activeEvent.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Event Detail Dialog */}
      <Dialog onOpenChange={setShowEventDialog} open={showEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${EVENT_COLORS[selectedEvent?.type || "event"]}`}
              />
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && EVENT_TYPE_LABELS[selectedEvent.type]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>
                {selectedEvent?.start &&
                  format(selectedEvent.start, "EEEE, MMMM d, yyyy")}
              </span>
            </div>

            {selectedEvent?.end && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>
                  {format(selectedEvent.start, "h:mm a")} -{" "}
                  {format(selectedEvent.end, "h:mm a")}
                </span>
              </div>
            )}

            {selectedEvent?.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent?.assignedTo && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-500" />
                <span>{selectedEvent.assignedTo}</span>
              </div>
            )}

            {selectedEvent?.guestCount && (
              <div className="flex items-center gap-2 text-sm">
                <PartyPopper className="w-4 h-4 text-gray-500" />
                <span>{selectedEvent.guestCount} guests</span>
              </div>
            )}

            {selectedEvent?.details && (
              <div className="text-sm text-gray-600 pt-2 border-t">
                {selectedEvent.details}
              </div>
            )}

            {selectedEvent?.status && (
              <Badge className="mt-2" variant="outline">
                {selectedEvent.status}
              </Badge>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setShowEventDialog(false)} variant="outline">
              Close
            </Button>
            <Button onClick={openSelectedEventDetails}>View Details</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) =>
          setRescheduleDialog((prev) => ({ ...prev, open }))
        }
        open={rescheduleDialog.open}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Reschedule Event
            </DialogTitle>
            <DialogDescription>
              Confirm the new date for this event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/20 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Event:</span>
                <span className="font-medium">
                  {rescheduleDialog.event?.title}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Current date:</span>
                <span className="font-medium">
                  {rescheduleDialog.event?.start &&
                    format(rescheduleDialog.event.start, "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">New date:</span>
                <span className="font-medium text-blue-600">
                  {rescheduleDialog.newDate &&
                    format(rescheduleDialog.newDate, "EEEE, MMMM d, yyyy")}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              The event time (
              {rescheduleDialog.event?.start &&
                format(rescheduleDialog.event.start, "h:mm a")}
              ) will be preserved.
            </p>
          </div>

          <DialogFooter>
            <Button
              disabled={isRescheduling}
              onClick={() =>
                setRescheduleDialog({ open: false, event: null, newDate: null })
              }
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isRescheduling} onClick={handleConfirmReschedule}>
              {isRescheduling ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overflow Dialog for +N more */}
      <Dialog
        onOpenChange={(open) =>
          setOverflowDialog((prev) => ({ ...prev, open }))
        }
        open={overflowDialog.open}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {overflowDialog.date
                ? format(overflowDialog.date, "EEEE, MMMM d, yyyy")
                : "Calendar entries"}
            </DialogTitle>
            <DialogDescription>
              {overflowDialog.events.length}{" "}
              {overflowDialog.events.length === 1 ? "entry" : "entries"} on this
              date
            </DialogDescription>
          </DialogHeader>

          <ResearchTable
            rows={overflowDialog.events
              .sort((a, b) => a.start.getTime() - b.start.getTime())
              .map((e) => ({
                id: e.id,
                title: e.title,
                href:
                  e.type === "event"
                    ? `/events/${e.id}`
                    : e.type === "shift"
                      ? `/scheduling/shifts/${e.id}`
                      : `/staff/time-off/${e.id}`,
                pills: (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.type === "event"
                        ? "bg-[var(--ds-calendar-event-light)] text-blue-700"
                        : e.type === "shift"
                          ? "bg-[var(--ds-calendar-shift-light)] text-green-700"
                          : "bg-[var(--ds-calendar-timeoff-light)] text-amber-700"
                    }`}
                  >
                    {e.type === "timeoff" ? "Time off" : e.type}
                  </span>
                ),
                meta: (
                  <span className="font-mono text-xs">
                    {format(e.start, "h:mm a")}
                  </span>
                ),
              }))}
          />

          <DialogFooter>
            <Button
              onClick={() =>
                setOverflowDialog({ open: false, date: null, events: [] })
              }
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading skeleton
export function UnifiedCalendarSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-muted/50 rounded animate-pulse" />
          <div className="h-8 w-20 bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[...new Array(7)].map((_, i) => (
          <div
            className="h-8 bg-muted/50 rounded animate-pulse"
            key={`header-${i}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 auto-rows-fr min-h-[600px]">
        {[...new Array(35)].map((_, i) => (
          <div
            className="border rounded-lg p-2 bg-muted/20 animate-pulse"
            key={`cell-${i}`}
          >
            <div className="h-6 w-6 bg-muted/50 rounded mb-2" />
            <div className="h-4 w-full bg-muted/50 rounded mb-1" />
            <div className="h-4 w-2/3 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default UnifiedCalendar;
