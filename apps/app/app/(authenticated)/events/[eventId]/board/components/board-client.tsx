"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { useEffect, useMemo, useState } from "react";
import type { EventBoardData, PaletteStaff } from "../actions";
import { getOrCreateEventBoard } from "../actions";
import {
  useCreateStaffDraft,
  useDraftImpact,
  useEventBoardData,
  useRemoveDraftCard,
} from "../board-hooks";
import { computeBranchStatus, resolveTemplate } from "../templates";
import { Palette } from "./palette";
import { ShiftDialog, type ShiftDialogSubmit } from "./shift-dialog";
import { TreeCanvas } from "./tree-canvas";
import { TreeOutline } from "./tree-outline";

interface BoardClientProps {
  eventId: string;
  initialBoardId: string | null;
  initialData: EventBoardData;
  palette: PaletteStaff[];
}

export function BoardClient({
  eventId,
  initialBoardId,
  initialData,
  palette,
}: BoardClientProps) {
  // Lazy board creation: the tab content unmounts when inactive, so mount ==
  // tab activation. The governed CommandBoard.create only fires when the user
  // actually opens the Command Board tab (and no board exists yet).
  const [boardId, setBoardId] = useState<string | null>(initialBoardId);
  useEffect(() => {
    if (boardId !== null) return;
    let cancelled = false;
    getOrCreateEventBoard(eventId).then(
      (res) => !cancelled && setBoardId(res.boardId),
      () => undefined // surfaced on first draft attempt; board stays null
    );
    return () => {
      cancelled = true;
    };
  }, [boardId, eventId]);

  const { data } = useEventBoardData(eventId, initialData);
  const board = data ?? initialData;

  const drafts = board.draftCards.filter(
    (c) => c.envelope.draftState === "draft"
  );
  const staffDrafts = drafts.filter(
    (c) => c.envelope.draftAction.kind === "assign-staff"
  );

  const { template, status } = useMemo(() => {
    const tpl = resolveTemplate(board.event.eventType);
    return {
      template: tpl,
      status: computeBranchStatus(tpl, {
        guestCount: board.event.guestCount,
        counts: {
          ...board.committedCounts,
          staff: board.committedCounts.staff + staffDrafts.length,
        },
      }),
    };
  }, [board, staffDrafts.length]);

  const impact = useDraftImpact(eventId, boardId, drafts.length > 0);
  const conflictCount = drafts.length > 0 ? impact.data?.conflicts.length : 0;

  const createDraft = useCreateStaffDraft(eventId);
  const removeDraft = useRemoveDraftCard(eventId);
  const paletteById = useMemo(
    () => new Map(palette.map((p) => [p.id, p])),
    [palette]
  );
  const [pendingStaff, setPendingStaff] = useState<PaletteStaff | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over?.id !== "branch-staff") return;
    const staff = e.active.data.current?.staff as PaletteStaff | undefined;
    if (staff) {
      setDraftError(null);
      setPendingStaff(staff);
    }
  };

  const handleConfirm = async (input: ShiftDialogSubmit) => {
    if (!pendingStaff) return;
    // If the lazy mount-effect create failed (it swallows rejection and never
    // re-runs), confirm is the retry point: re-attempt board creation here.
    let targetBoardId = boardId;
    if (targetBoardId === null) {
      try {
        const res = await getOrCreateEventBoard(eventId);
        targetBoardId = res.boardId;
        setBoardId(targetBoardId);
      } catch (err) {
        setDraftError(
          err instanceof Error ? err.message : "Failed to create event board"
        );
        return;
      }
    }
    createDraft.mutate(
      {
        boardId: targetBoardId,
        staff: { id: pendingStaff.id, name: pendingStaff.name },
        ...input,
      },
      {
        onSuccess: (res) => {
          if (res.success) setPendingStaff(null);
          else setDraftError(res.error ?? "Failed to create draft card");
        },
        onError: (err) => setDraftError(err.message),
      }
    );
  };

  return (
    <div className="flex h-[calc(100vh-15rem)] min-h-[480px] flex-col gap-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5">
        <h2 className="truncate text-base font-semibold">{board.event.title}</h2>
        <Badge variant="outline">{template.label}</Badge>
        <Badge variant="secondary">{status.readyPercent}% ready</Badge>
        <Badge variant="secondary">
          {drafts.length} draft{drafts.length === 1 ? "" : "s"}
        </Badge>
        {conflictCount !== undefined && conflictCount > 0 && (
          <Badge variant="destructive">
            {conflictCount} conflict{conflictCount === 1 ? "" : "s"}
          </Badge>
        )}
        <div className="ml-auto">
          <Button disabled size="sm" title="coming in Task 11">
            Review &amp; Commit
          </Button>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_300px] gap-3">
          {/* LEFT — outline + palette */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-lg border border-border bg-background p-3">
            <TreeOutline status={status} />
            <Palette palette={palette} />
          </div>

          {/* CENTER — tree canvas */}
          <div
            className="relative min-h-0 rounded-lg border border-border bg-background"
            data-board-canvas
            id="event-board-canvas"
          >
            <TreeCanvas
              battleBoardHref={`/events/${eventId}/battle-board`}
              committedStaff={board.committedStaff}
              conflicts={
                drafts.length > 0 ? (impact.data?.conflicts ?? []) : []
              }
              draftCards={board.draftCards}
              event={board.event}
              onRemoveDraft={(cardId) => removeDraft.mutate(cardId)}
              paletteById={paletteById}
              removing={removeDraft.isPending}
              status={status}
            />
          </div>

          {/* RIGHT — impact rail + AI placeholder (Task 11) */}
          <div className="min-h-0 space-y-3 overflow-y-auto rounded-lg border border-border bg-background p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Impact &amp; AI — Task 11
            </h3>
            {drafts.length > 0 && impact.data ? (
              <dl className="space-y-2 text-sm">
                <ImpactRow label="Labor cost" value={`$${impact.data.laborCost}`} />
                <ImpactRow
                  label="Total hours"
                  value={impact.data.totalHours.toFixed(1)}
                />
                <ImpactRow
                  label="Conflicts"
                  value={String(impact.data.conflicts.length)}
                  warn={impact.data.conflicts.length > 0}
                />
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">
                Drop staff onto the board to see live impact.
              </p>
            )}
          </div>
        </div>
      </DndContext>

      <ShiftDialog
        errorMessage={draftError}
        eventDate={board.event.eventDate}
        onClose={() => setPendingStaff(null)}
        onConfirm={handleConfirm}
        pending={createDraft.isPending}
        staff={pendingStaff}
      />
    </div>
  );
}

function ImpactRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-medium tabular-nums",
          warn && "text-destructive"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
