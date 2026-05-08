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
import { Separator } from "@repo/design-system/components/ui/separator";
import { captureException } from "@sentry/nextjs";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { Header } from "../../../components/header";

interface PrepListItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  recipeId: string | null;
  station: string | null;
  prepDate: string;
  status: string;
  notes: string | null;
  recipe?: {
    id: string;
    name: string;
  };
}

interface PrepList {
  id: string;
  eventId: string;
  event: {
    id: string;
    name: string;
    eventDate: string;
    guestCount: number;
  };
  status: string;
  items: PrepListItem[];
}

const stationColors: Record<string, string> = {
  "Hot Line": "border-hairline bg-muted/50 text-foreground",
  "Cold Station": "border-hairline bg-muted/20 text-foreground",
  Pastry: "border-hairline bg-muted/50 text-foreground",
  Prep: "border-hairline bg-soft-stone text-ink",
  "Garde Manger": "border-hairline bg-muted/20 text-foreground",
};

function getPrepDateLabel(date: string): { label: string; isUrgent: boolean } {
  const prepDate = parseISO(date);
  const _today = new Date();

  if (isToday(prepDate)) {
    return { label: "TODAY", isUrgent: true };
  }
  if (isTomorrow(prepDate)) {
    return { label: "TOMORROW", isUrgent: true };
  }
  if (isPast(prepDate)) {
    return { label: "OVERDUE", isUrgent: true };
  }
  return { label: format(prepDate, "MMM d"), isUrgent: false };
}

export default function PrepListsMobilePage() {
  const [prepLists, setPrepLists] = useState<PrepList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const fetchPrepLists = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch("/api/kitchen/prep-lists");
      if (response.ok) {
        const data = await response.json();
        setPrepLists(data.prepLists || []);
      }
    } catch (error) {
      captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrepLists();
  }, [fetchPrepLists]);

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

  // Group items by station
  const itemsByStation: Record<string, PrepListItem[]> = {};
  prepLists.forEach((list) => {
    list.items.forEach((item) => {
      const station = item.station || "Unassigned";
      if (!itemsByStation[station]) {
        itemsByStation[station] = [];
      }
      itemsByStation[station].push(item);
    });
  });

  // Sort items within each station by prep date
  Object.keys(itemsByStation).forEach((station) => {
    itemsByStation[station].sort(
      (a, b) => new Date(a.prepDate).getTime() - new Date(b.prepDate).getTime()
    );
  });

  const totalItems = Object.values(itemsByStation).flat().length;
  const completedItems = Object.values(itemsByStation)
    .flat()
    .filter((item) => item.status === "completed").length;

  return (
    <div className="editorial-surface-reset flex min-h-0 flex-1 flex-col bg-canvas text-foreground">
      <Header page="Prep Lists" pages={["Kitchen Ops"]} />

      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-hairline bg-soft-stone px-4 py-2">
          <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-ink">
            You're offline. Some features may be unavailable.
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {/* Summary card */}
        <Card className="mb-4 border-hairline bg-soft-stone" tone="soft-stone">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {prepLists.length} Event{prepLists.length !== 1 ? "s" : ""}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-emerald-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-500" />
                )}
                <Button
                  disabled={isLoading || !isOnline}
                  onClick={fetchPrepLists}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  {completedItems} / {totalItems} items complete
                </span>
              </div>
              {totalItems > 0 && (
                <div className="font-medium text-ink text-sm">
                  {Math.round((completedItems / totalItems) * 100)}%
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events summary */}
        {prepLists.map((list) => {
          const eventDate = parseISO(list.event.eventDate);
          return (
            <Card className="mb-3 border-hairline" key={list.id} tone="canvas">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{list.event.name}</CardTitle>
                <CardDescription className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(eventDate, "MMM d, h:mm a")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {list.event.guestCount} guests
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}

        <Separator className="my-4 bg-hairline" />

        {/* Items by station */}
        {Object.keys(itemsByStation).length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12">
            <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
            <p className="text-center text-muted-foreground">
              No prep items right now!
            </p>
          </div>
        ) : (
          Object.entries(itemsByStation).map(([station, items]) => (
            <div className="mb-6" key={station}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink">{station}</h3>
                <Badge
                  className={`border text-xs ${stationColors[station] || "border-hairline bg-soft-stone text-ink"}`}
                >
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {items.map((item) => {
                const prepDateLabel = getPrepDateLabel(item.prepDate);
                const isCompleted = item.status === "completed";

                return (
                  <Card
                    className={`mb-2 border-2 ${
                      prepDateLabel.isUrgent && !isCompleted
                        ? "border-rose-300"
                        : "border-hairline"
                    } ${isCompleted ? "bg-soft-stone/50" : "bg-card"}`}
                    key={item.id}
                    tone="canvas"
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <h4
                            className={`font-semibold text-ink ${
                              isCompleted
                                ? "text-muted-foreground line-through"
                                : ""
                            }`}
                          >
                            {item.itemName}
                          </h4>
                          {item.recipe && (
                            <p className="text-muted-foreground text-sm">
                              Recipe: {item.recipe.name}
                            </p>
                          )}
                        </div>
                        {isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-soft-stone px-3 py-1 font-bold text-ink text-sm">
                            {item.quantity} {item.unit}
                          </span>
                          <Badge
                            className={`text-xs ${
                              prepDateLabel.isUrgent && !isCompleted
                                ? "bg-rose-900/10 text-rose-700 border-rose-900/20"
                                : ""
                            }`}
                            variant="outline"
                          >
                            {prepDateLabel.label}
                          </Badge>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="mt-2 text-muted-foreground text-sm">
                          Note: {item.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
