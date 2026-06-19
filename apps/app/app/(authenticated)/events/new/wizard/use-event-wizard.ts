"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type DraftEventInput,
  type EventDraftSnapshot,
  finalizeEventFromWizard,
  loadEventDraft,
  saveEventDraft,
} from "../../actions";
import {
  computeCompletionPercent,
  EMPTY_WIZARD_DATA,
  type EventWizardData,
  REVIEW_STEP_INDEX,
  stepIndexFromCompletion,
  WIZARD_STEPS,
  wizardDataFromSnapshot,
} from "./types";

const RESUME_KEY = "event-wizard:resume";

interface ResumeRecord {
  eventId: string;
  step: number;
}

function readResume(): ResumeRecord | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ResumeRecord;
    if (!parsed?.eventId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeResume(eventId: string, step: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify({ eventId, step }));
  } catch {
    // localStorage can throw in private mode / quota — resume is best-effort.
  }
}

function clearResume(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(RESUME_KEY);
  } catch {
    // ignore
  }
}

/** Coerce accumulated wizard strings into the numeric/typed draft payload. */
function sliceForStep(
  data: EventWizardData,
  stepIndex: number
): DraftEventInput {
  const fields = WIZARD_STEPS[stepIndex]?.fields ?? [];
  const has = (key: keyof EventWizardData) => fields.includes(key);

  const input: DraftEventInput = {};
  if (has("title")) {
    input.title = data.title;
  }
  if (has("eventType")) {
    input.eventType = data.eventType;
  }
  if (has("eventDate")) {
    input.eventDate = data.eventDate;
  }
  if (has("guestCount")) {
    input.guestCount = Number(data.guestCount) || 1;
  }
  if (has("eventFormat")) {
    input.eventFormat = data.eventFormat;
  }
  if (has("tags")) {
    input.tags = data.tags;
  }
  if (has("accessibilityOptions")) {
    input.accessibilityOptions = data.accessibilityOptions;
  }
  if (has("budget")) {
    input.budget = data.budget ? Number(data.budget) : 0;
  }
  if (has("ticketPrice")) {
    input.ticketPrice = data.ticketPrice ? Number(data.ticketPrice) : 0;
  }
  if (has("ticketTier")) {
    input.ticketTier = data.ticketTier;
  }
  if (has("notes")) {
    input.notes = data.notes;
  }
  if (has("venueName")) {
    input.venueName = data.venueName;
  }
  if (has("venueAddress")) {
    input.venueAddress = data.venueAddress;
  }
  if (has("featuredMediaUrl")) {
    input.featuredMediaUrl = data.featuredMediaUrl;
  }
  return input;
}

export interface UseEventWizardOptions {
  /** A draft id pulled from ?eventId= on the route (resume entry point). */
  initialEventId?: string;
  initialSnapshot?: EventDraftSnapshot | null;
}

export interface EventWizardState {
  canProceed: boolean;
  completionPercent: number;
  currentStep: number;
  data: EventWizardData;
  draftId: string | null;
  error: string | null;
  goBack: () => void;
  goToStep: (step: number) => void;
  isFinalizing: boolean;
  isResuming: boolean;
  isSaving: boolean;
  saveAndExit: () => Promise<void>;
  setField: <K extends keyof EventWizardData>(
    field: K,
    value: EventWizardData[K]
  ) => void;
  submitAndAdvance: () => Promise<void>;
  submitFinal: () => Promise<void>;
  toggleArrayItem: (
    field: "tags" | "accessibilityOptions",
    item: string
  ) => void;
}

export function useEventWizard(
  options: UseEventWizardOptions = {}
): EventWizardState {
  const { initialEventId, initialSnapshot } = options;

  const [data, setData] = useState<EventWizardData>(() =>
    initialSnapshot
      ? hydrateFromSnapshot(initialSnapshot)
      : { ...EMPTY_WIZARD_DATA }
  );
  const [draftId, setDraftId] = useState<string | null>(
    initialEventId ?? initialSnapshot?.eventId ?? null
  );
  const [currentStep, setCurrentStep] = useState<number>(() =>
    initialSnapshot
      ? stepIndexFromCompletion(
          computeCompletionPercent(snapshotForCompletion(initialSnapshot))
        )
      : 0
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);

  // Persist resume pointer whenever draft id or step changes.
  useEffect(() => {
    if (draftId) {
      writeResume(draftId, currentStep);
    }
  }, [draftId, currentStep]);

  const setField = useCallback(
    <K extends keyof EventWizardData>(field: K, value: EventWizardData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
      setError(null);
    },
    []
  );

  const toggleArrayItem = useCallback(
    (field: "tags" | "accessibilityOptions", item: string) => {
      setData((prev) => {
        const current = prev[field];
        const next = current.includes(item)
          ? current.filter((value) => value !== item)
          : [...current, item];
        return { ...prev, [field]: next };
      });
      setError(null);
    },
    []
  );

  const completionPercent = computeCompletionPercent({
    accessibilityOptions: data.accessibilityOptions,
    budget: Number(data.budget) || 0,
    eventDate: data.eventDate,
    eventType: data.eventType,
    guestCount: Number(data.guestCount) || 0,
    notes: data.notes,
    status: draftId ? "draft" : "draft",
    tags: data.tags,
    ticketPrice: Number(data.ticketPrice) || 0,
    title: data.title,
    venueName: data.venueName,
  });

  const canProceed = (() => {
    switch (WIZARD_STEPS[currentStep]?.id) {
      case "details":
        return (
          !!data.title.trim() &&
          !!data.eventType.trim() &&
          !!data.eventDate &&
          Number(data.guestCount) > 0
        );
      default:
        return true;
    }
  })();

  const persistStep = useCallback(
    async (stepIndex: number): Promise<boolean> => {
      // Cancel any in-flight save (older step) before issuing the new one.
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setIsSaving(true);
      setError(null);
      try {
        const slice = sliceForStep(data, stepIndex);
        const result = await saveEventDraft({
          data: slice,
          eventId: draftId ?? undefined,
        });
        if (controller.signal.aborted) {
          return false;
        }
        if (result?.error) {
          setError(result.error);
          return false;
        }
        if (result?.eventId && result.eventId !== draftId) {
          setDraftId(result.eventId);
        }
        return true;
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to save step.");
        }
        return false;
      } finally {
        if (inFlight.current === controller) {
          inFlight.current = null;
        }
        setIsSaving(false);
      }
    },
    [data, draftId]
  );

  const submitAndAdvance = useCallback(async () => {
    const ok = await persistStep(currentStep);
    if (!ok) {
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, REVIEW_STEP_INDEX));
  }, [currentStep, persistStep]);

  const saveAndExit = useCallback(async () => {
    // Best-effort save of the current step before navigating away; the draft
    // is already persisted from prior completed steps.
    await persistStep(currentStep);
    clearResume();
    if (typeof window !== "undefined") {
      window.location.href = "/events";
    }
  }, [currentStep, persistStep]);

  const submitFinal = useCallback(async () => {
    if (!draftId) {
      // Nothing to finalize — route back to step 0 if somehow reached without
      // a draft (defensive; the review step is gated behind prior saves).
      setError("Save your details before confirming.");
      return;
    }
    setIsFinalizing(true);
    setError(null);
    try {
      const result = await finalizeEventFromWizard(draftId);
      if (result?.error) {
        setError(result.error);
      }
      // On success finalizeEventFromWizard redirects, so we never reach here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm event.");
    } finally {
      setIsFinalizing(false);
    }
  }, [draftId]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < WIZARD_STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  // One-time resume: if the route did not hand us an initial draft, but a
  // resume pointer exists in localStorage, hydrate from the persisted draft.
  useEffect(() => {
    if (initialEventId || initialSnapshot) {
      return;
    }
    const resume = readResume();
    if (!resume) {
      return;
    }
    let cancelled = false;
    setIsResuming(true);
    loadEventDraft(resume.eventId)
      .then((snapshot) => {
        if (cancelled || !snapshot) {
          // Snapshot is null when the event was deleted or already confirmed
          // (loadEventDraft returns null for non-drafts). Drop the stale
          // pointer so a fresh wizard opens instead of reopening a confirmed
          // event for re-finalize.
          if (!cancelled) {
            clearResume();
          }
          return;
        }
        setData(hydrateFromSnapshot(snapshot));
        setDraftId(snapshot.eventId);
        const resumeStep =
          resume.step >= 0 && resume.step < WIZARD_STEPS.length
            ? resume.step
            : stepIndexFromCompletion(
                computeCompletionPercent(snapshotForCompletion(snapshot))
              );
        setCurrentStep(resumeStep);
      })
      .catch(() => {
        clearResume();
      })
      .finally(() => {
        if (!cancelled) {
          setIsResuming(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialEventId, initialSnapshot]);

  return {
    canProceed,
    completionPercent,
    currentStep,
    data,
    draftId,
    error,
    isFinalizing,
    isResuming,
    isSaving,
    goBack,
    goToStep,
    saveAndExit,
    setField,
    submitAndAdvance,
    submitFinal,
    toggleArrayItem,
  };
}

function hydrateFromSnapshot(snapshot: EventDraftSnapshot): EventWizardData {
  return wizardDataFromSnapshot(snapshot);
}

function snapshotForCompletion(
  snapshot: EventDraftSnapshot
): Parameters<typeof computeCompletionPercent>[0] {
  return snapshot;
}
