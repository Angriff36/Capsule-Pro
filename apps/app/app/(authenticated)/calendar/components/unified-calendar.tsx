"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin, Briefcase, PartyPopper, X, Filter } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { Input } from "@repo/design-system/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@repo/design-system/components/ui/dialog";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: "event" | "shift" | "timeoff" | "deadline" | "reminder";
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
  initialShifts?: any[];
  initialTimeOff?: any[];
}

// Color scheme for different event types
const EVENT_COLORS: Record<string, string> = {
  event: "bg-blue-500 border-blue-600",
  shift: "bg-emerald-500 border-emerald-600", 
  timeoff: "bg-amber-500 border-amber-600",
  deadline: "bg-red-500 border-red-600",
  reminder: "bg-purple-500 border-purple-600",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  event: "Events",
  shift: "Shifts",
  timeoff: "Time Off",
  deadline: "Deadlines",
  reminder: "Reminders",
};

export function UnifiedCalendar({ 
  tenantId, 
  initialEvents = [], 
  initialShifts = [], 
  initialTimeOff = [] 
}: UnifiedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [filters, setFilters] = useState<string[]>(["event", "shift", "timeoff", "deadline", "reminder"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        
        const response = await fetch(`/api/calendar?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error("Failed to fetch calendar data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCalendarData();
  }, [tenantId, currentDate, filters]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesFilter = filters.includes(event.type);
      const matchesSearch = !searchQuery || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.details?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [events, filters, searchQuery]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => 
      isSameDay(event.start, day)
    );
  };

  // Navigation
  const nextPeriod = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    else setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
  };

  const prevPeriod = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    else setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  // Toggle filter
  const toggleFilter = (filter: string) => {
    setFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevPeriod}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextPeriod}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 p-4 border-b bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
            <Badge
              key={type}
              variant={filters.includes(type) ? "default" : "outline"}
              className={`cursor-pointer ${filters.includes(type) ? EVENT_COLORS[type].replace('bg-', 'bg-').replace('border-', 'border-') : ''}`}
              onClick={() => toggleFilter(type)}
            >
              {label}
            </Badge>
          ))}
        </div>
        <div className="ml-auto">
          <Input 
            placeholder="Search events..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 auto-rows-fr min-h-[600px]">
          {calendarDays.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[120px] p-2 border rounded-lg transition-colors
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isCurrentDay ? 'ring-2 ring-emerald-500' : 'border-gray-200'}
                  hover:border-gray-300
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`
                    text-sm font-medium
                    ${isCurrentDay ? 'bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}
                    ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                  `}>
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[90px]">
                  {dayEvents.slice(0, 4).map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`
                        px-2 py-1 rounded text-xs cursor-pointer truncate
                        ${EVENT_COLORS[event.type] || 'bg-gray-500'}
                        text-white
                      `}
                      title={event.title}
                    >
                      {format(event.start, "HH:mm")} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{dayEvents.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${EVENT_COLORS[selectedEvent?.type || 'event']}`} />
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && EVENT_TYPE_LABELS[selectedEvent.type]}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{selectedEvent?.start && format(selectedEvent.start, "EEEE, MMMM d, yyyy")}</span>
            </div>
            
            {selectedEvent?.end && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>
                  {format(selectedEvent.start, "h:mm a")} - {format(selectedEvent.end, "h:mm a")}
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
              <Badge variant="outline" className="mt-2">
                {selectedEvent.status}
              </Badge>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Close
            </Button>
            <Button>
              View Details
            </Button>
          </div>
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
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 auto-rows-fr min-h-[600px]">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="border rounded-lg p-2 bg-gray-50 animate-pulse">
            <div className="h-6 w-6 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-full bg-gray-200 rounded mb-1" />
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default UnifiedCalendar;
