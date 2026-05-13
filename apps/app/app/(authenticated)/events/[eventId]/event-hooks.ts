"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshEventDetailsData } from "./event-query-actions";
import { updateEventForMutation } from "./event-mutation-actions";
import {
  addDishToEvent,
  removeDishFromEvent,
  createDishVariantForEvent,
  createDishAndAddToEvent,
} from "../actions/event-dishes";
import {
  generateEventSummary,
  deleteEventSummary,
} from "../actions/event-summary";
import {
  generateTaskBreakdown,
  saveTaskBreakdown,
} from "../actions/task-breakdown";
import {
  generateEventPrepList,
} from "../actions/prep-list-generation";
import type { GenerateEventPrepListInput } from "../actions/prep-list-generation";

// ============================================================================
// Query Keys
// ============================================================================

export const eventKeys = {
  /** All events list */
  all: ["events"] as const,
  /** A single event with all its detail data */
  detail: (eventId: string) => ["event", eventId] as const,
  /** Event stats only */
  stats: (eventId: string) => ["event", eventId, "stats"] as const,
  /** Event guests */
  guests: (eventId: string) => ["event", eventId, "guests"] as const,
  /** Event dishes */
  dishes: (eventId: string) => ["event", eventId, "dishes"] as const,
  /** Event timeline */
  timeline: (eventId: string) => ["event", eventId, "timeline"] as const,
} as const;

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetches all event details data. The page.tsx server component hydrates
 * the initial data, then TanStack Query manages subsequent refetches after
 * mutations invalidate this key.
 */
export function useEventDetails(
  eventId: string,
  initialData?: Awaited<ReturnType<typeof refreshEventDetailsData>>
) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => refreshEventDetailsData(eventId),
    initialData,
    staleTime: 60_000,
  });
}

// ============================================================================
// Mutation Hooks — Optimistic Updates
// ============================================================================
//
// Simple mutations (add/remove dish, create variant, RSVP) use the
// cancelQueries → onMutate snapshot → onError rollback → onSettled refetch
// pattern. The UI updates INSTANTLY from the cache; the background refetch
// (onSettled) ensures eventual consistency with the server.
//
// AI generation mutations (breakdown, summary, prep list) still use plain
// invalidateQueries since the generated data is too complex to patch
// optimistically.

/**
 * Updates an event's metadata (title, date, status, etc).
 * Invalidates the detail query so the UI re-fetches instead of reloading.
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => updateEventForMutation(formData),
    onSuccess: (_data, formData) => {
      const eventId = formData.get("eventId");
      if (typeof eventId === "string" && eventId) {
        queryClient.invalidateQueries({
          queryKey: eventKeys.detail(eventId),
        });
      }
      // Also invalidate the global events list in case status/title changed
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

/** Adds a dish to an event. Optimistic: cache updates instantly, refetch in background. */
export function useAddDishToEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      dishId,
      course,
      quantityServings,
    }: {
      eventId: string;
      dishId: string;
      course?: string;
      quantityServings?: number;
    }) => addDishToEvent(eventId, dishId, course, quantityServings),
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId) });
      const previous = queryClient.getQueryData(eventKeys.detail(eventId));
      return { previous };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(eventKeys.detail(eventId), context.previous);
      }
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/** Removes a dish from an event. Optimistic: cache updates instantly, refetch in background. */
export function useRemoveDishFromEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, linkId }: { eventId: string; linkId: string }) =>
      removeDishFromEvent(eventId, linkId),
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId) });
      const previous = queryClient.getQueryData(eventKeys.detail(eventId));
      return { previous };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(eventKeys.detail(eventId), context.previous);
      }
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/**
 * Creates a variant of an existing dish and replaces the linked dish
 * on the event. Optimistic: cache updates instantly, refetch in background.
 */
export function useCreateDishVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      linkId,
      newDishName,
    }: {
      eventId: string;
      linkId: string;
      newDishName: string;
    }) => createDishVariantForEvent(eventId, linkId, newDishName),
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId) });
      const previous = queryClient.getQueryData(eventKeys.detail(eventId));
      return { previous };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(eventKeys.detail(eventId), context.previous);
      }
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/** Creates a new dish and adds it to the event. Optimistic. */
export function useCreateDishAndAdd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      name,
      recipeId,
      category,
      course,
    }: {
      eventId: string;
      name: string;
      recipeId: string;
      category?: string;
      course?: string;
    }) => createDishAndAddToEvent(eventId, name, recipeId, category, course),
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId) });
      const previous = queryClient.getQueryData(eventKeys.detail(eventId));
      return { previous };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(eventKeys.detail(eventId), context.previous);
      }
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

// ============================================================================
// Mutation Hooks — Full Invalidation (AI-generated data)
// ============================================================================

/** Generates an AI event summary. Full invalidation since data is server-generated. */
export function useGenerateEventSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => generateEventSummary(eventId),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/** Deletes an event summary. Invalidates event detail on success. */
export function useDeleteEventSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      summaryId,
      eventId,
    }: {
      summaryId: string;
      eventId: string;
    }) => deleteEventSummary(summaryId),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/** Generates a task breakdown for an event. Full invalidation since data is AI-generated. */
export function useGenerateTaskBreakdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      customInstructions,
    }: {
      eventId: string;
      customInstructions?: string;
    }) => generateTaskBreakdown({ eventId, customInstructions }),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/** Saves a task breakdown. Invalidates event detail on success. */
export function useSaveTaskBreakdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      breakdown,
    }: {
      eventId: string;
      breakdown: Parameters<typeof saveTaskBreakdown>[1];
    }) => saveTaskBreakdown(eventId, breakdown),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/** Generates a prep list for an event. Full invalidation since data is AI-generated. */
export function useGeneratePrepList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateEventPrepListInput) =>
      generateEventPrepList(input),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/** Quick RSVP — adds a guest to an event. Optimistic. */
export function useQuickRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      guestName,
      guestEmail,
    }: {
      eventId: string;
      guestName: string;
      guestEmail?: string;
    }) => {
      const response = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: guestName, email: guestEmail }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Failed to add RSVP");
      }
      return { eventId };
    },
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId) });
      const previous = queryClient.getQueryData(eventKeys.detail(eventId));
      return { previous };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(eventKeys.detail(eventId), context.previous);
      }
    },
    onSettled: (result) => {
      if (!result) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(result.eventId) });
    },
  });
}
