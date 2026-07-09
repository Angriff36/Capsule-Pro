"use client";

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
import {
  getPrepList,
  prepListItemUpdatePrepNotes,
} from "@/app/lib/manifest-client.generated";
import type { PrepList, PrepListItem } from "../../types";
import { PrepItemCard } from "../prep-item-card";
import { PrepItemNoteSheet } from "../prep-item-note-sheet";
import { setPrepListItemCompletionViaComposite } from "../set-prep-list-item-completion";
import { togglePrepListItemCompletion } from "../toggle-prep-list-item-completion";
import { usePrepItemSwipe } from "../use-prep-item-swipe";

interface CompletionQueueItem {
  completed: boolean;
  itemId: string;
  timestamp: string;
}

interface NoteQueueItem {
  itemId: string;
  notes: string;
  timestamp: string;
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

  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PrepListItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteQueue, setNoteQueue] = useState<NoteQueueItem[]>([]);

  const openNoteSheet = useCallback((item: PrepListItem) => {
    setSelectedItem(item);
    setNoteText(item.notes || "");
    setNoteSheetOpen(true);
  }, []);

  const { swipeState, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePrepItemSwipe(openNoteSheet);

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
      const data = await getPrepList(prepListId);
      setPrepList((data ?? {}) as unknown as PrepList);
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

  // Sync offline completions when coming back online via composite route
  useEffect(() => {
    if (!isOnline || completionQueue.length === 0 || !prepListId) {
      return;
    }

    const syncOfflineCompletions = async () => {
      const failedItems: CompletionQueueItem[] = [];

      for (const item of completionQueue) {
        const result = await setPrepListItemCompletionViaComposite({
          prepListId,
          itemId: item.itemId,
          completed: item.completed,
        });
        if (!result.ok) {
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
      if (!prepListId) {
        return;
      }

      const result = await togglePrepListItemCompletion({
        prepListId,
        itemId: item.id,
        currentlyCompleted: item.completed,
        isOnline,
        applyOptimistic: (completed) => {
          setPrepList((current) => {
            if (!current) {
              return current;
            }
            let delta = 0;
            if (completed !== item.completed) {
              delta = completed ? 1 : -1;
            }
            return {
              ...current,
              items: current.items?.map((row) =>
                row.id === item.id ? { ...row, completed } : row
              ),
              completedCount: current.completedCount + delta,
            };
          });
        },
        queueOffline: ({ itemId, completed }) => {
          setCompletionQueue((prev) => [
            ...prev,
            {
              itemId,
              completed,
              timestamp: new Date().toISOString(),
            },
          ]);
        },
        revert: async () => {
          await fetchPrepList();
        },
      });

      if (!result.ok) {
        setError("Failed to update item. Please try again.");
      }
    },
    [isOnline, prepListId, fetchPrepList]
  );

  useEffect(() => {
    if (!isOnline || noteQueue.length === 0) {
      return;
    }

    const syncOfflineNotes = async () => {
      const failedItems: NoteQueueItem[] = [];

      for (const item of noteQueue) {
        try {
          await prepListItemUpdatePrepNotes({
            id: item.itemId,
            newNotes: item.notes,
            newDietarySubstitutions: [],
          });
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

  const handleSaveNote = useCallback(async () => {
    if (!(selectedItem && noteText.trim())) {
      setNoteSheetOpen(false);
      return;
    }

    setIsSavingNote(true);

    if (prepList) {
      setPrepList({
        ...prepList,
        items: prepList.items?.map((i) =>
          i.id === selectedItem.id ? { ...i, notes: noteText.trim() } : i
        ),
      });
    }

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
      await prepListItemUpdatePrepNotes({
        id: selectedItem.id,
        newNotes: noteText.trim(),
        newDietarySubstitutions: [],
      });
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
          <h1 className="font-bold text-slate-900 text-xl">
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

      {(completionQueue.length > 0 || noteQueue.length > 0) && (
        <div className="mb-4 rounded-lg bg-blue-100 p-3 text-center text-blue-700 text-sm">
          {completionQueue.length + noteQueue.length} change
          {completionQueue.length + noteQueue.length > 1 ? "s" : ""} pending
          sync
        </div>
      )}

      <div className="mb-2 text-center text-slate-400 text-xs">
        ← Swipe left on an item to add notes
      </div>

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

      <PrepItemNoteSheet
        isSaving={isSavingNote}
        itemName={selectedItem?.name}
        noteText={noteText}
        onCancel={() => {
          setNoteSheetOpen(false);
          setSelectedItem(null);
          setNoteText("");
        }}
        onNoteTextChange={setNoteText}
        onOpenChange={setNoteSheetOpen}
        onSave={handleSaveNote}
        open={noteSheetOpen}
      />
    </div>
  );
}
