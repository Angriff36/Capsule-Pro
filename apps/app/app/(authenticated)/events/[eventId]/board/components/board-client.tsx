"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CommitResponse, EventBoardData, PaletteStaff } from "../actions";
import { getOrCreateEventBoard } from "../actions";
import { buildBoardDisplayRows } from "../board-display";
import {
  useCommitBoard,
  useCreateStaffDraft,
  useDraftImpact,
  useEventBoardData,
  useRemoveDraftCard,
} from "../board-hooks";
import { computeBranchStatus, resolveTemplate } from "../templates";
import { CommitDialog } from "./commit-dialog";
import { ImpactRail } from "./impact-rail";
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

  const createDraft = useCreateStaffDraft(eventId);
  const removeDraft = useRemoveDraftCard(eventId);
  const commitBoard = useCommitBoard(eventId);
  const paletteById = useMemo(
    () => new Map(palette.map((p) => [p.id, p])),
    [palette]
  );
  const [pendingStaff, setPendingStaff] = useState<PaletteStaff | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);

  // Display-ready rows (ids -> names) so rail + dialog stay presentational.
  const liveImpact = drafts.length > 0 ? impact.data : undefined;
  const { conflictRows, missingRateNames, dialogDrafts } =
    buildBoardDisplayRows({
      impact: liveImpact,
      staffDrafts,
      paletteById,
      committedStaff: board.committedStaff,
    });

  const commitResult: CommitResponse | null = commitBoard.isError
    ? { success: false, error: commitBoard.error.message }
    : (commitBoard.data ?? null);

  const handleCommitSuccess = (res: CommitResponse) => {
    if (!res.success) return; // failure: dialog stays open showing the error
    setCommitOpen(false); // invalidation refreshes cards -> tokens flip green
    const n = res.committedCount;
    toast.success(`Committed ${n} draft${n === 1 ? "" : "s"}`);
  };

  const handleCommitConfirm = () => {
    if (!boardId) return;
    commitBoard.mutate(boardId, { onSuccess: handleCommitSuccess });
  };

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
        {conflictRows.length > 0 && (
          <Badge variant="destructive">
            {conflictRows.length} conflict{conflictRows.length === 1 ? "" : "s"}
          </Badge>
        )}
        <div className="ml-auto">
          <Button
            disabled={drafts.length === 0 || boardId === null}
            onClick={() => {
              commitBoard.reset(); // clear a stale failure from a prior attempt
              setCommitOpen(true);
            }}
            size="sm"
          >
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
              conflicts={liveImpact?.conflicts ?? []}
              draftCards={board.draftCards}
              event={board.event}
              onRemoveDraft={(cardId) => removeDraft.mutate(cardId)}
              paletteById={paletteById}
              removing={removeDraft.isPending}
              status={status}
            />
          </div>

          {/* RIGHT — impact rail + AI placeholder */}
          <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-background p-3">
            <ImpactRail
              conflictRows={conflictRows}
              draftCount={drafts.length}
              impact={liveImpact}
              impactLoading={impact.isPending}
              missingRateNames={missingRateNames}
            />
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

      <CommitDialog
        committing={commitBoard.isPending}
        drafts={dialogDrafts}
        impact={liveImpact}
        onConfirm={handleCommitConfirm}
        onOpenChange={setCommitOpen}
        open={commitOpen}
        result={commitResult}
      />
    </div>
  );
}
