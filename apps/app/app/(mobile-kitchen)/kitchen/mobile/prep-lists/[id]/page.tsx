"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { captureException } from "@sentry/nextjs";
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  MessageSquare,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { PrepList, PrepListItem } from "../../types";

interface CompletionQueueItem {
  itemId: string;
  completed: boolean;
  timestamp: string;
}

interface NoteQueueItem {
  itemId: string;
  notes: string;
  timestamp: string;
}

interface SwipeState {
  itemId: string;
  translateX: number;
  isSwiping: boolean;
}

// Extracted item renderer to reduce complexity
interface PrepItemCardProps {
  item: PrepListItem;
  swipeState: SwipeState | null;
  onToggleComplete: (item: PrepListItem) => void;
  onTouchStart: (e: React.TouchEvent, itemId: string) => void;
  onTouchMove: (e: React.TouchEvent, itemId: string) => void;
  onTouchEnd: (item: PrepListItem) => void;
}

function PrepItemCard({
  item,
  swipeState,
  onToggleComplete,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: PrepItemCardProps) {
  const isThisSwiping = swipeState?.itemId === item.id && swipeState.isSwiping;
  const translateX = swipeState?.itemId === item.id ? swipeState.translateX : 0;

  return (
    <div
      className="relative"
      style={{ touchAction: isThisSwiping ? "pan-y" : "auto" }}
    >
      {/* Swipe reveal background - note icon */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-amber-500 px-6 rounded-xl"
        style={{ opacity: Math.min(1, Math.abs(translateX) / 80) }}
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </div>

      {/* Main item card */}
      <button
        className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-transform ${
          item.completed
            ? "border-emerald-300 bg-emerald-50"
            : "border-slate-200 bg-white"
        }`}
        onClick={() => {
          if (!swipeState?.isSwiping) {
            onToggleComplete(item);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleComplete(item);
          }
        }}
        onTouchEnd={() => onTouchEnd(item)}
        onTouchMove={(e) => onTouchMove(e, item.id)}
        onTouchStart={(e) => onTouchStart(e, item.id)}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
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
          {item.completed && <CheckCircle2 className="h-5 w-5 text-white" />}
        </div>

        {/* Item details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`text-lg font-medium truncate ${
                item.completed
                  ? "text-slate-400 line-through"
                  : "text-slate-900"
              }`}
            >
              {item.name}
            </h3>
            {item.notes && <Flag className="h-4 w-4 shrink-0 text-amber-500" />}
          </div>
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
            <p className="mt-1 text-amber-600 text-sm line-clamp-2">
              📝 {item.notes}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}

export default function MobilePrepListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const prepListId = params?.id as string;

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

  // Note sheet state
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PrepListItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteQueue, setNoteQueue] = useState<NoteQueueItem[]>([]);

  // Swipe state
  const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const SWIPE_THRESHOLD = 80; // Minimum distance to trigger action

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
            itemId: item.id,
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

  // Sync offline notes when coming back online
  useEffect(() => {
    if (!isOnline || noteQueue.length === 0) {
      return;
    }

    const syncOfflineNotes = async () => {
      const failedItems: NoteQueueItem[] = [];

      for (const item of noteQueue) {
        try {
          const response = await apiFetch(
            "/api/kitchen/prep-lists/items/commands/update-prep-notes",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: item.itemId,
                newNotes: item.notes,
                newDietarySubstitutions: "",
              }),
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
        setNoteQueue([]);
        await fetchPrepList();
      } else {
        setNoteQueue(failedItems);
      }
    };

    syncOfflineNotes();
  }, [isOnline, noteQueue, fetchPrepList]);

  // Handle saving notes
  const handleSaveNote = useCallback(async () => {
    if (!(selectedItem && noteText.trim())) {
      setNoteSheetOpen(false);
      return;
    }

    setIsSavingNote(true);

    // Optimistic update
    if (prepList) {
      setPrepList({
        ...prepList,
        items: prepList.items?.map((i) =>
          i.id === selectedItem.id ? { ...i, notes: noteText.trim() } : i
        ),
      });
    }

    // If offline, queue the action
    if (!isOnline) {
      setNoteQueue((prev) => [
        ...prev,
        {
          itemId: selectedItem.id,
          notes: noteText.trim(),
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsSavingNote(false);
      setNoteSheetOpen(false);
      setSelectedItem(null);
      setNoteText("");
      return;
    }

    try {
      const response = await apiFetch(
        "/api/kitchen/prep-lists/items/commands/update-prep-notes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedItem.id,
            newNotes: noteText.trim(),
            newDietarySubstitutions: "",
          }),
        }
      );

      if (!response.ok) {
        // Revert optimistic update on failure
        await fetchPrepList();
        const errData = await response.json();
        setError(errData.message || "Failed to save note");
      }
    } catch (err) {
      captureException(err);
      await fetchPrepList();
      setError("Failed to save note. Please try again.");
    } finally {
      setIsSavingNote(false);
      setNoteSheetOpen(false);
      setSelectedItem(null);
      setNoteText("");
    }
  }, [selectedItem, noteText, prepList, isOnline, fetchPrepList]);

  // Touch handlers for swipe gesture
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, itemId: string) => {
      touchStartX.current = e.touches[0]?.clientX ?? 0;
      touchStartY.current = e.touches[0]?.clientY ?? 0;
      setSwipeState({ itemId, translateX: 0, isSwiping: false });
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, itemId: string) => {
      if (!swipeState || swipeState.itemId !== itemId) {
        return;
      }

      const currentX = e.touches[0]?.clientX ?? 0;
      const currentY = e.touches[0]?.clientY ?? 0;
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;

      // If vertical scroll is dominant, don't swipe
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      // Only allow swipe left (negative deltaX)
      const translateX = Math.min(0, deltaX);

      setSwipeState({
        itemId,
        translateX,
        isSwiping: Math.abs(deltaX) > 10,
      });
    },
    [swipeState]
  );

  const handleTouchEnd = useCallback(
    (item: PrepListItem) => {
      if (!swipeState || swipeState.itemId !== item.id) {
        return;
      }

      // If swiped left beyond threshold, open note sheet
      if (swipeState.translateX < -SWIPE_THRESHOLD) {
        setSelectedItem(item);
        setNoteText(item.notes || "");
        setNoteSheetOpen(true);
      }

      setSwipeState(null);
    },
    [swipeState]
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
      {(completionQueue.length > 0 || noteQueue.length > 0) && (
        <div className="mb-4 rounded-lg bg-blue-100 p-3 text-center text-blue-700 text-sm">
          {completionQueue.length + noteQueue.length} change
          {completionQueue.length + noteQueue.length > 1 ? "s" : ""} pending
          sync
        </div>
      )}

      {/* Swipe hint */}
      <div className="mb-2 text-center text-slate-400 text-xs">
        ← Swipe left on an item to add notes
      </div>

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
            <PrepItemCard
              item={item}
              key={item.id}
              onToggleComplete={handleToggleComplete}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onTouchStart={handleTouchStart}
              swipeState={swipeState}
            />
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

      {/* Note sheet */}
      <Sheet onOpenChange={setNoteSheetOpen} open={noteSheetOpen}>
        <SheetContent className="flex flex-col" side="bottom">
          <SheetHeader>
            <SheetTitle>Add Note</SheetTitle>
            <SheetDescription>
              {selectedItem?.name} - Add prep notes or flag issues
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 py-4">
            <Textarea
              className="min-h-[120px] text-lg"
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter prep notes or flag an issue..."
              value={noteText}
            />
          </div>
          <SheetFooter className="flex-row gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                setNoteSheetOpen(false);
                setSelectedItem(null);
                setNoteText("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={isSavingNote}
              onClick={handleSaveNote}
            >
              {isSavingNote ? "Saving..." : "Save Note"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
