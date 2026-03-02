"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import { format, isToday, isTomorrow } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChefHat,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { PrepList } from "../types";

function formatEventDate(dateString: string | null): string {
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
}

function getCompletionPercentage(list: PrepList): number {
  if (list.totalCount === 0) {
    return 0;
  }
  return Math.round((list.completedCount / list.totalCount) * 100);
}

function getCompletionColor(percentage: number): string {
  if (percentage >= 100) {
    return "bg-emerald-500";
  }
  if (percentage >= 50) {
    return "bg-amber-500";
  }
  return "bg-slate-300";
}

export default function MobilePrepListsPage() {
  const [prepLists, setPrepLists] = useState<PrepList[]>([]);
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

  const fetchPrepLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/kitchen/prep-lists?status=active");

      if (response.ok) {
        const data = await response.json();
        setPrepLists(data.prepLists || []);
      } else {
        const errData = await response.json();
        setError(errData.message || "Failed to load prep lists");
      }
    } catch (err) {
      captureException(err);
      console.error("[MobilePrepLists] Failed to fetch prep lists:", err);
      setError("Failed to load prep lists. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrepLists();
  }, [fetchPrepLists]);

  // Group prep lists by event
  const groupedByEvent = prepLists.reduce<
    Record<string, { event: PrepList["event"]; lists: PrepList[] }>
  >((acc, list) => {
    const eventKey = list.event?.id || "no-event";
    if (!acc[eventKey]) {
      acc[eventKey] = {
        event: list.event,
        lists: [],
      };
    }
    acc[eventKey].lists.push(list);
    return acc;
  }, {});

  return (
    <div className="flex flex-1 flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">Prep Lists</h1>
          <p className="text-slate-500 text-sm">
            {prepLists.length} active list{prepLists.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          disabled={isLoading || !isOnline}
          onClick={fetchPrepLists}
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

      {/* Prep lists grouped by event */}
      {Object.keys(groupedByEvent).length === 0 && !isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <ChefHat className="mb-4 h-16 w-16 text-slate-300" />
          <p className="text-center text-slate-600">No active prep lists</p>
          <p className="mt-2 text-center text-slate-400 text-sm">
            Prep lists will appear when events are scheduled.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByEvent).map(([eventKey, group]) => (
            <div key={eventKey}>
              {/* Event header */}
              {group.event && (
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-700">
                    {group.event.name}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {formatEventDate(group.event.startTime)}
                  </span>
                </div>
              )}

              {/* Prep list cards */}
              <div className="space-y-3">
                {group.lists.map((list) => {
                  const completionPercentage = getCompletionPercentage(list);
                  const isComplete = completionPercentage >= 100;

                  return (
                    <Link
                      className="block"
                      href={`/kitchen/mobile/prep-lists/${list.id}`}
                      key={list.id}
                    >
                      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="p-4">
                          {/* List name and station */}
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-lg text-slate-900">
                                {list.name}
                              </h3>
                              {list.station && (
                                <Badge className="mt-1" variant="outline">
                                  {list.station.name}
                                </Badge>
                              )}
                            </div>
                            {isComplete ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            ) : null}
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="text-slate-500">
                                {list.completedCount}/{list.totalCount} items
                              </span>
                              <span className="font-medium">
                                {completionPercentage}%
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full transition-all duration-300 ${getCompletionColor(completionPercentage)}`}
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
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
  );
}
