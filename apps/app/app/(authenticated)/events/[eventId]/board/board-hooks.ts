"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  commitEventBoard,
  createDishDraftCard,
  createStaffDraftCard,
  type EventBoardData,
  getDraftImpact,
  getEventBoardData,
  removeDraftCard,
} from "./actions";
import type { DraftEnvelope } from "./draft-metadata";

// ============================================================================
// Query Keys
// ============================================================================

export const boardKeys = {
  data: (eventId: string) => ["event-board", eventId] as const,
  impact: (eventId: string, boardId: string) =>
    ["event-board", eventId, boardId, "impact"] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Board data for an event. The EventBoardTab server component hydrates the
 * initial data; TanStack Query manages refetches after draft mutations.
 */
export function useEventBoardData(
  eventId: string,
  initialData: EventBoardData
) {
  return useQuery({
    queryKey: boardKeys.data(eventId),
    queryFn: () => getEventBoardData(eventId),
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Live impact of draft cards (labor cost, hours, conflicts).
 * Only runs when a board exists and there is at least one draft —
 * pass `enabled` (typically `draftCount > 0`) from the data query.
 */
export function useDraftImpact(
  eventId: string,
  boardId: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: boardKeys.impact(eventId, boardId ?? "pending"),
    queryFn: () => getDraftImpact(eventId, boardId as string),
    enabled: boardId !== null && enabled,
    staleTime: 30_000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================
//
// Invalidating boardKeys.data(eventId) — ["event-board", eventId] — also
// matches the impact key by prefix, so one invalidation refreshes both.

// ---------------------------------------------------------------------------
// Optimistic card builder helpers
// ---------------------------------------------------------------------------

/** Builds a synthetic draftCards entry that matches EventBoardData["draftCards"][number]. */
function makeSyntheticCard(
  tempId: string,
  title: string,
  envelope: DraftEnvelope
): EventBoardData["draftCards"][number] {
  return { cardId: tempId, envelope, title };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Creates an assign-staff draft card on the board. */
export function useCreateStaffDraft(eventId: string) {
  const queryClient = useQueryClient();
  const key = boardKeys.data(eventId);

  return useMutation({
    mutationFn: (input: Parameters<typeof createStaffDraftCard>[0]) =>
      createStaffDraftCard(input),

    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EventBoardData>(key);

      const envelope: DraftEnvelope = {
        draftAction: {
          kind: "assign-staff",
          entityType: "User",
          entityId: vars.staff.id,
          params: {
            role: vars.role,
            shiftStart: vars.shiftStart,
            shiftEnd: vars.shiftEnd,
          },
        },
        draftState: "draft",
        committedRecordId: null,
      };
      const tempCard = makeSyntheticCard(
        `optimistic-staff-${vars.staff.id}`,
        vars.staff.name,
        envelope
      );

      if (previous) {
        queryClient.setQueryData<EventBoardData>(key, {
          ...previous,
          draftCards: [...previous.draftCards, tempCard],
        });
      }

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData<EventBoardData>(key, ctx.previous);
      }
      toast.error("Failed to add staff draft card");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Creates an add-dish draft card on the board. */
export function useCreateDishDraft(eventId: string) {
  const queryClient = useQueryClient();
  const key = boardKeys.data(eventId);

  return useMutation({
    mutationFn: (input: Parameters<typeof createDishDraftCard>[0]) =>
      createDishDraftCard(input),

    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EventBoardData>(key);

      const envelope: DraftEnvelope = {
        draftAction: {
          kind: "add-dish",
          entityType: "Dish",
          entityId: vars.dish.id,
          params: {
            quantityServings: String(vars.quantityServings),
            course: vars.course,
            specialInstructions: vars.specialInstructions,
          },
        },
        draftState: "draft",
        committedRecordId: null,
      };
      const tempCard = makeSyntheticCard(
        `optimistic-dish-${vars.dish.id}`,
        vars.dish.name,
        envelope
      );

      if (previous) {
        queryClient.setQueryData<EventBoardData>(key, {
          ...previous,
          draftCards: [...previous.draftCards, tempCard],
        });
      }

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData<EventBoardData>(key, ctx.previous);
      }
      toast.error("Failed to add dish draft card");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Removes a draft card from the board. */
export function useRemoveDraftCard(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => removeDraftCard(cardId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.data(eventId) });
    },
  });
}

/**
 * Commits all draft cards on the board (atomic apps/api endpoint). Returns the
 * full CommitResponse so the dialog can read `failedCardId` / `error`.
 * Invalidation matches the impact key by prefix, refreshing both queries.
 */
export function useCommitBoard(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) => commitEventBoard(boardId, eventId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.data(eventId) });
    },
  });
}
