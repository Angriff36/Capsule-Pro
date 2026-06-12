"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  eventTimelineItemCompleteItem,
  eventTimelineItemCreateItem,
  eventTimelineItemDeleteItem,
} from "@/app/lib/manifest-client.generated";

interface TimelineItem {
  completedAt: string | null;
  description: string;
  id: string;
  isCompleted: boolean;
  notes: string | null;
  responsibleRole: string | null;
  sortOrder: number;
  timelineTime: string; // HH:MM
}

interface EventTimelineClientProps {
  eventId: string;
  initialItems: TimelineItem[];
}

interface DraftItem {
  description: string;
  notes: string;
  responsibleRole: string;
  timelineTime: string;
}

const EMPTY_DRAFT: DraftItem = {
  timelineTime: "",
  description: "",
  responsibleRole: "",
  notes: "",
};

export function EventTimelineClient({
  eventId,
  initialItems,
}: EventTimelineClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<TimelineItem[]>(initialItems);
  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!(draft.timelineTime && draft.description.trim())) {
      setError("Time and description are required");
      return;
    }

    try {
      const result = await eventTimelineItemCreateItem({
        eventId,
        description: draft.description.trim(),
      });

      if (result) {
        setItems((current) =>
          mergeAndSort([...current, result as unknown as TimelineItem])
        );
      }
      setDraft(EMPTY_DRAFT);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  };

  const handleToggle = async (itemId: string, isCompleted: boolean) => {
    setError(null);
    // Optimistic update
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isCompleted,
              completedAt: isCompleted ? new Date().toISOString() : null,
            }
          : item
      )
    );

    try {
      await eventTimelineItemCompleteItem({ id: itemId });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, isCompleted: !isCompleted } : item
        )
      );
    }
  };

  const confirmDelete = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) {
      return;
    }
    const itemId = itemToDelete;
    setError(null);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== itemId));
    setDeleteDialogOpen(false);
    setItemToDelete(null);

    try {
      await eventTimelineItemDeleteItem({ id: itemId });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setItems(previous);
    }
  };

  return (
    <div className="space-y-6">
      <form
        className="rounded-[22px] border border-hairline bg-canvas p-6"
        onSubmit={handleAdd}
      >
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
          Add timeline item
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[120px_1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="timeline-time">Time (24h)</Label>
            <Input
              id="timeline-time"
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  timelineTime: event.target.value,
                }))
              }
              placeholder="14:30"
              type="time"
              value={draft.timelineTime}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-description">Description</Label>
            <Input
              id="timeline-description"
              maxLength={200}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Doors open / first course service / breakdown"
              value={draft.description}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-role">Responsible role</Label>
            <Input
              id="timeline-role"
              maxLength={80}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  responsibleRole: event.target.value,
                }))
              }
              placeholder="Captain, Chef, Bar lead"
              value={draft.responsibleRole}
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="timeline-notes">Notes (optional)</Label>
          <Textarea
            id="timeline-notes"
            maxLength={500}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Cue the playlist, dim the lights, etc."
            rows={2}
            value={draft.notes}
          />
        </div>
        {error ? (
          <p className="mt-3 text-coral text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Button disabled={isPending} type="submit">
            Add to timeline
          </Button>
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-10 text-center">
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
            Empty
          </p>
          <p className="mt-3 text-ink text-sm leading-relaxed">
            No timeline items yet. Add the first moment above to start
            sequencing this event's run-of-show.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((item) => (
            <li
              className="rounded-[22px] border border-hairline bg-canvas p-5"
              key={item.id}
            >
              <div className="flex flex-wrap items-start gap-4">
                <Checkbox
                  aria-label={`Mark "${item.description}" complete`}
                  checked={item.isCompleted}
                  className="mt-1"
                  onCheckedChange={(checked) =>
                    handleToggle(item.id, checked === true)
                  }
                />
                <div className="min-w-[64px] font-mono text-ink text-sm tabular-nums">
                  {item.timelineTime}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-ink text-sm leading-relaxed ${
                      item.isCompleted
                        ? "text-muted-foreground line-through"
                        : ""
                    }`}
                  >
                    {item.description}
                  </p>
                  {item.responsibleRole ? (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                      {item.responsibleRole}
                    </p>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-2 text-muted-foreground text-xs">
                      {item.notes}
                    </p>
                  ) : null}
                </div>
                <Button
                  className="text-coral hover:text-coral/80"
                  onClick={() => confirmDelete(item.id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove timeline item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this timeline item from the event.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function mergeAndSort(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    if (a.timelineTime !== b.timelineTime) {
      return a.timelineTime.localeCompare(b.timelineTime);
    }
    return a.id.localeCompare(b.id);
  });
}
