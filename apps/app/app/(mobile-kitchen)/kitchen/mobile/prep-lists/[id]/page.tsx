"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { OfflineQueueItem, PrepList, PrepListItem } from "../../types";

interface CompletionQueueItem extends OfflineQueueItem {
  itemId: string;
  completed: boolean;
}

export default function MobilePrepListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const prepListId = params.id as string;

  const [prepList, setPrepList] = useState<PrepList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [completionQueue, setCompletionQueue] = useState<CompletionQueueItem[]>(
    []
  );
  const [filter, setFilter] = useState<"all" | "incomplete" | "complete">(
    "incomplete"
  );

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

  const fetchPrepList = useCallback(async () => {
    if (!prepListId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/kitchen/prep-lists/${prepListId}`);

      if (response.ok) {
        const data = await response.json();
        setPrepList(data.prepList || data);
      } else {
        const errData = await response.json();
        setError(errData.message || "Failed to load prep list");
      }
    } catch (err) {
      captureException(err);
      console.error("[MobilePrepListDetail] Failed to fetch prep list:", err);
      setError("Failed to load prep list. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [prepListId]);

  useEffect(() => {
    fetchPrepList();
  }, [fetchPrepList]);

  // Sync offline completions when coming back online
  useEffect(() => {
    if (!isOnline || completionQueue.length === 0) {
      return;
    }

    const syncOfflineCompletions = async () => {
      const failedItems: CompletionQueueItem[] = [];

      for (const item of completionQueue) {
        try {
          const response = await apiFetch(
            `/api/kitchen/prep-lists/${prepListId}/items/${item.itemId}/complete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ completed: item.completed }),
            }
          );

          if (!response.ok) {
            failedItems.push(item);
          }
        } catch {
          failedItems.push(item);
        }
      }

      if (failedItems.length === 0) {
        setCompletionQueue([]);
        await fetchPrepList();
      } else {
        setCompletionQueue(failedItems);
      }
    };

    syncOfflineCompletions();
  }, [isOnline, completionQueue, prepListId, fetchPrepList]);

  const handleToggleComplete = useCallback(
    async (item: PrepListItem) => {
      const newCompleted = !item.completed;

      // Optimistic update
      if (prepList) {
        setPrepList({
          ...prepList,
          items: prepList.items?.map((i) =>
            i.id === item.id ? { ...i, completed: newCompleted } : i
          ),
          completedCount: prepList.completedCount + (newCompleted ? 1 : -1),
        });
      }

      // If offline, queue the action
      if (!isOnline) {
        setCompletionQueue((prev) => [
          ...prev,
          {
            taskId: item.id,
            itemId: item.id,
            action: "complete",
            completed: newCompleted,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      try {
        const response = await apiFetch(
          `/api/kitchen/prep-lists/${prepListId}/items/${item.id}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: newCompleted }),
          }
        );

        if (!response.ok) {
          // Revert optimistic update on failure
          await fetchPrepList();
          const errData = await response.json();
          setError(errData.message || "Failed to update item");
        }
      } catch (err) {
        captureException(err);
        // Revert on error
        await fetchPrepList();
        setError("Failed to update item. Please try again.");
      }
    },
    [isOnline, prepList, prepListId, fetchPrepList]
  );

  const filteredItems = prepList?.items?.filter((item) => {
    if (filter === "incomplete") {
      return !item.completed;
    }
    if (filter === "complete") {
      return item.completed;
    }
    return true;
  });

  return (
    <div className="flex flex-1 flex-col p-4">
      {/* Header with back button */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          className="shrink-0"
          onClick={() => router.push("/kitchen/mobile/prep-lists")}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-xl text-slate-900">
            {prepList?.name || "Loading..."}
          </h1>
          {prepList?.event && (
            <p className="text-slate-500 text-sm">{prepList.event.name}</p>
          )}
        </div>
        <Button
          disabled={isLoading || !isOnline}
          onClick={fetchPrepList}
          size="icon"
          variant="outline"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Status bar */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <Wifi className="h-3 w-3" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          )}
        </div>
        {prepList && (
          <span className="text-slate-500">
            {prepList.completedCount}/{prepList.totalCount} complete
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-rose-100 p-3">
          <span className="text-rose-700 text-sm">{error}</span>
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

      {/* Offline queue indicator */}
      {completionQueue.length > 0 && (
        <div className="mb-4 rounded-lg bg-blue-100 p-3 text-center text-blue-700 text-sm">
          {completionQueue.length} change{completionQueue.length > 1 ? "s" : ""}{" "}
          pending sync
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        <Button
          className="flex-1"
          onClick={() => setFilter("incomplete")}
          size="sm"
          variant={filter === "incomplete" ? "default" : "outline"}
        >
          Incomplete
        </Button>
        <Button
          className="flex-1"
          onClick={() => setFilter("all")}
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
        >
          All
        </Button>
        <Button
          className="flex-1"
          onClick={() => setFilter("complete")}
          size="sm"
          variant={filter === "complete" ? "default" : "outline"}
        >
          Done
        </Button>
      </div>

      {/* Items list */}
      <div className="flex-1 space-y-2 overflow-auto pb-4">
        {filteredItems && filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <button
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                item.completed
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
              key={item.id}
              onClick={() => handleToggleComplete(item)}
              type="button"
            >
              {/* Checkbox */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 ${
                  item.completed
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300"
                }`}
              >
                {item.completed && (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                )}
              </div>

              {/* Item details */}
              <div className="flex-1">
                <h3
                  className={`text-lg font-medium ${
                    item.completed
                      ? "text-slate-400 line-through"
                      : "text-slate-900"
                  }`}
                >
                  {item.name}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-slate-500 text-sm">
                    {item.quantity} {item.unit || "pcs"}
                  </span>
                  {item.station && (
                    <Badge className="text-xs" variant="outline">
                      {item.station.name}
                    </Badge>
                  )}
                </div>
                {item.notes && (
                  <p className="mt-1 text-slate-400 text-sm">{item.notes}</p>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-12">
            <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
            <p className="text-center text-slate-600">
              {filter === "incomplete"
                ? "All items complete!"
                : "No items to display"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
