"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  CommitResponse,
  EventBoardData,
  PaletteDish,
  PaletteStaff,
} from "../actions";
import { getOrCreateEventBoard } from "../actions";
import { buildBoardDisplayRows } from "../board-display";
import {
  useCommitBoard,
  useCreateDishDraft,
  useCreateStaffDraft,
  useDraftImpact,
  useEventBoardData,
  useRemoveDraftCard,
} from "../board-hooks";
import { computeBranchStatus, resolveTemplate } from "../templates";
import { BoardOnboardingOverlay } from "../../../components/board-onboarding-overlay";
import { CommitDialog } from "./commit-dialog";
import { DishDialog, type DishDialogSubmit } from "./dish-dialog";
import { ImpactRail } from "./impact-rail";
import { DragGhost, type DragItem, Palette } from "./palette";
import { ShiftDialog, type ShiftDialogSubmit } from "./shift-dialog";
import { TreeCanvas } from "./tree-canvas";
import { TreeOutline } from "./tree-outline";

interface BoardClientProps {
  dishPalette: PaletteDish[];
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
  dishPalette,
}: BoardClientProps) {
  // Lazy board creation: the tab content unmounts when inactive, so mount ==
  // tab activation. The governed CommandBoard.create only fires when the user
  // actually opens the Event tree tab (and no board exists yet).
  const [boardId, setBoardId] = useState<string | null>(initialBoardId);
  // StrictMode double-fires this effect; reusing the in-flight promise keeps
  // the governed CommandBoard.create to a single call per mount cycle.
  const boardCreateRef = useRef<Promise<{ boardId: string }> | null>(null);
  useEffect(() => {
    if (boardId !== null) {
      return;
    }
    let cancelled = false;
    boardCreateRef.current ??= getOrCreateEventBoard(eventId);
    boardCreateRef.current.then(
      (res) => !cancelled && setBoardId(res.boardId),
      () => {
        // Surfaced on first draft attempt; board stays null. Clear the ref so
        // a later mount (or resolveBoardId) can retry.
        boardCreateRef.current = null;
      }
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
  const dishDrafts = drafts.filter(
    (c) => c.envelope.draftAction.kind === "add-dish"
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
          menu: board.committedCounts.menu + dishDrafts.length,
        },
      }),
    };
  }, [board, staffDrafts.length, dishDrafts.length]);

  const impact = useDraftImpact(eventId, boardId, staffDrafts.length > 0);

  const createStaffDraft = useCreateStaffDraft(eventId);
  const createDishDraft = useCreateDishDraft(eventId);
  const removeDraft = useRemoveDraftCard(eventId);
  const commitBoard = useCommitBoard(eventId);
  const paletteById = useMemo(
    () => new Map(palette.map((p) => [p.id, p])),
    [palette]
  );
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [pendingStaff, setPendingStaff] = useState<PaletteStaff | null>(null);
  const [pendingDish, setPendingDish] = useState<PaletteDish | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);

  // Distance threshold separates clicks (token expansion, links) from drags
  // and gives the cursor change a beat before the ghost appears.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Display-ready rows (ids -> names) so rail + dialog stay presentational.
  const liveImpact = staffDrafts.length > 0 ? impact.data : undefined;
  const { conflictRows, missingRateNames, dialogDrafts } =
    buildBoardDisplayRows({
      impact: liveImpact,
      staffDrafts,
      dishDrafts,
      paletteById,
      committedStaff: board.committedStaff,
    });

  const commitResult: CommitResponse | null = commitBoard.isError
    ? { success: false, error: commitBoard.error.message }
    : (commitBoard.data ?? null);

  const handleCommitSuccess = (res: CommitResponse) => {
    if (!res.success) {
      return; // failure: dialog stays open showing the error
    }
    setCommitOpen(false); // invalidation refreshes cards -> tokens flip green
    const n = res.committedCount;
    toast.success(`Committed ${n} draft${n === 1 ? "" : "s"}`);
  };

  const handleCommitConfirm = () => {
    if (!boardId) {
      return;
    }
    commitBoard.mutate(boardId, { onSuccess: handleCommitSuccess });
  };

  const handleDragStart = (e: DragStartEvent) => {
    const item = e.active.data.current as DragItem | undefined;
    setActiveDrag(item ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const item = e.active.data.current as DragItem | undefined;
    setActiveDrag(null);
    if (!item) {
      return;
    }
    if (e.over?.id === "branch-staff" && item.kind === "staff") {
      setDraftError(null);
      setPendingStaff(item.staff);
    } else if (e.over?.id === "branch-menu" && item.kind === "dish") {
      setDraftError(null);
      setPendingDish(item.dish);
    }
  };

  /** Lazy-create retry point: the mount-effect create swallows rejections. */
  const resolveBoardId = async (): Promise<string | null> => {
    if (boardId !== null) {
      return boardId;
    }
    try {
      const res = await getOrCreateEventBoard(eventId);
      setBoardId(res.boardId);
      return res.boardId;
    } catch (err) {
      setDraftError(
        err instanceof Error ? err.message : "Failed to create event board"
      );
      return null;
    }
  };

  const handleStaffConfirm = async (input: ShiftDialogSubmit) => {
    if (!pendingStaff) {
      return;
    }
    // Duplicate guard: a staff member already committed or drafted on this
    // board gets no second card (the server guard catches races; this keeps
    // the obvious case instant).
    const alreadyOnBoard =
      board.committedStaff.some((s) => s.staffMemberId === pendingStaff.id) ||
      staffDrafts.some(
        (c) => c.envelope.draftAction.entityId === pendingStaff.id
      );
    if (alreadyOnBoard) {
      setPendingStaff(null);
      toast.info(`${pendingStaff.name} is already on this event`);
      return;
    }
    const targetBoardId = await resolveBoardId();
    if (targetBoardId === null) {
      return;
    }
    // Close the dialog immediately — the optimistic update in the mutation hook
    // makes the card appear at once; onError rolls back and shows a toast.
    setPendingStaff(null);
    setDraftError(null);
    createStaffDraft.mutate({
      boardId: targetBoardId,
      staff: { id: pendingStaff.id, name: pendingStaff.name },
      ...input,
    });
  };

  const handleDishConfirm = async (input: DishDialogSubmit) => {
    if (!pendingDish) {
      return;
    }
    const targetBoardId = await resolveBoardId();
    if (targetBoardId === null) {
      return;
    }
    // Close the dialog immediately — the optimistic update in the mutation hook
    // makes the card appear at once; onError rolls back and shows a toast.
    setPendingDish(null);
    setDraftError(null);
    createDishDraft.mutate({
      boardId: targetBoardId,
      dish: { id: pendingDish.id, name: pendingDish.name },
      ...input,
    });
  };

  return (
    <div className="flex h-[calc(100vh-12.5rem)] min-h-[560px] flex-col gap-3">
      <BoardOnboardingOverlay surface="event-tree" />
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5">
        <h2 className="truncate font-semibold text-base">
          {board.event.title}
        </h2>
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

      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="grid min-h-0 flex-1 grid-cols-[15rem_minmax(0,1fr)_17.5rem] gap-4">
          {/* LEFT — outline + palette */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-3">
            <TreeOutline status={status} />
            <Palette dishPalette={dishPalette} palette={palette} />
          </div>

          {/* CENTER — tree canvas */}
          <div
            className="relative min-h-0 rounded-xl border border-border bg-[radial-gradient(ellipse_at_center,rgba(167,139,250,0.06),transparent_70%)] bg-background"
            data-board-canvas
            id="event-board-canvas"
          >
            <TreeCanvas
              battleBoards={board.battleBoards}
              committedDishes={board.committedDishes}
              committedStaff={board.committedStaff}
              conflicts={liveImpact?.conflicts ?? []}
              draftCards={board.draftCards}
              dragKind={activeDrag?.kind ?? null}
              event={board.event}
              onRemoveDraft={(cardId) => removeDraft.mutate(cardId)}
              paletteById={paletteById}
              removing={removeDraft.isPending}
              status={status}
            />
          </div>

          {/* RIGHT — impact rail + AI assistant */}
          <div className="min-h-0 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-3">
            <ImpactRail
              conflictRows={conflictRows}
              dishDraftCount={dishDrafts.length}
              impact={liveImpact}
              impactLoading={impact.isPending}
              missingRateNames={missingRateNames}
              staffDraftCount={staffDrafts.length}
            />
          </div>
        </div>

        {/* Cursor-following ghost — the visual confirmation a drag is live. */}
        <DragOverlay dropAnimation={null}>
          {activeDrag ? <DragGhost item={activeDrag} /> : null}
        </DragOverlay>
      </DndContext>

      <ShiftDialog
        errorMessage={draftError}
        eventDate={board.event.eventDate}
        onClose={() => setPendingStaff(null)}
        onConfirm={handleStaffConfirm}
        pending={createStaffDraft.isPending}
        staff={pendingStaff}
      />

      <DishDialog
        dish={pendingDish}
        errorMessage={draftError}
        guestCount={board.event.guestCount}
        onClose={() => setPendingDish(null)}
        onConfirm={handleDishConfirm}
        pending={createDishDraft.isPending}
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
