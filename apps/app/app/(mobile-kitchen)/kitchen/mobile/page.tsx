"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import { format, isToday, isTomorrow } from "date-fns";
import { AlertCircle, Calendar, RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { TodayEvent } from "./types";

function getUrgencyBorderColor(urgency: TodayEvent["urgency"]): string {
  switch (urgency) {
    case "critical": {
      return "border-l-4 border-l-rose-500";
    }
    case "warning": {
      return "border-l-4 border-l-amber-500";
    }
    default: {
      return "border-l-4 border-l-emerald-500";
    }
  }
}

function getUrgencyBgColor(urgency: TodayEvent["urgency"]): string {
  switch (urgency) {
    case "critical": {
      return "bg-rose-50";
    }
    case "warning": {
      return "bg-amber-50";
    }
    default: {
      return "bg-emerald-50";
    }
  }
}

function getUrgencyBadgeColor(urgency: TodayEvent["urgency"]): string {
  switch (urgency) {
    case "critical": {
      return "bg-rose-500";
    }
    case "warning": {
      return "bg-amber-500";
    }
    default: {
      return "bg-emerald-500";
    }
  }
}

function getUrgencyLabel(urgency: TodayEvent["urgency"]): string {
  switch (urgency) {
    case "critical": {
      return "Urgent";
    }
    case "warning": {
      return "Soon";
    }
    default: {
      return "On Track";
    }
  }
}

export default function MobileTodayPage() {
  const [events, setEvents] = useState<TodayEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/kitchen/events/today");

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        const errData = await response.json();
        setError(errData.message || "Failed to load events");
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileToday] Failed to fetch events:", err);
      setError("Failed to load events. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const formatEventDate = (dateString: string | null) => {
    if (!dateString) {
      return "No date";
    }

    const date = new Date(dateString);

    if (isToday(date)) {
      return `Today, ${format(date, "h:mm a")}`;
    }

    if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, "h:mm a")}`;
    }

    return format(date, "EEE, MMM d, h:mm a");
  };

  return (
    <div className="flex flex-1 flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">Today</h1>
          <p className="text-slate-500 text-sm">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        <Button
          disabled={isLoading || !isOnline}
          onClick={fetchEvents}
          size="icon"
          variant="outline"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-rose-100 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span className="text-rose-700 text-sm">{error}</span>
          </div>
          <Button
            className="h-6 px-2 text-rose-600 text-xs"
            onClick={() => setError(null)}
            size="sm"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 && !isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <Calendar className="mb-4 h-16 w-16 text-slate-300" />
          <p className="text-center text-slate-600">No events today</p>
          <p className="mt-2 text-center text-slate-400 text-sm">
            Events with prep work will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              className={`overflow-hidden rounded-xl bg-white shadow-sm ${getUrgencyBorderColor(event.urgency)}`}
              key={event.id}
            >
              <div className={`p-4 ${getUrgencyBgColor(event.urgency)}`}>
                {/* Event name and time */}
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-bold text-lg text-slate-900">
                    {event.name}
                  </h3>
                  <Badge className={getUrgencyBadgeColor(event.urgency)}>
                    {getUrgencyLabel(event.urgency)}
                  </Badge>
                </div>

                {/* Event details */}
                <div className="flex flex-wrap items-center gap-3 text-slate-600 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatEventDate(event.startTime)}</span>
                  </div>
                  {event.headcount && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{event.headcount} guests</span>
                    </div>
                  )}
                </div>

                {/* Task counts */}
                <div className="mt-3 flex gap-3">
                  {event.unclaimedPrepCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-700 text-xs font-medium">
                      <AlertCircle className="h-3 w-3" />
                      {event.unclaimedPrepCount} unclaimed
                    </div>
                  )}
                  {event.incompleteItemsCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 text-xs font-medium">
                      {event.incompleteItemsCount} items left
                    </div>
                  )}
                  {event.unclaimedPrepCount === 0 &&
                    event.incompleteItemsCount === 0 && (
                      <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 text-xs font-medium">
                        All prep complete
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
