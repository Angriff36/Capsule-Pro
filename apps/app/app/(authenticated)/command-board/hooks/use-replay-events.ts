/**
 * use-replay-events Hook
 *
 * Fetches and replays events for a command board when a user joins.
 * This provides context for recent board activity.
 */

import { type ReplayEvent, type ReplayState } from "@repo/realtime";
import { useEffect, useState, useCallback, useRef } from "react";

interface UseReplayEventsOptions {
  /** Board ID to replay events for */
  boardId: string;
  /** Whether replay is enabled */
  enabled?: boolean;
  /** Maximum number of events to replay */
  maxEvents?: number;
  /** Callback when events need to be applied */
  onApplyEvents?: (events: ReplayEvent[]) => void;
  /** Callback when replay completes */
  onReplayComplete?: () => void;
}

interface UseReplayEventsResult {
  /** Current replay state */
  state: ReplayState;
  /** Number of events processed */
  processedCount: number;
  /** Total number of events to replay */
  totalCount: number;
  /** Error message if replay failed */
  error: string | null;
  /** Whether replay is active */
  isReplaying: boolean;
  /** Manually trigger replay */
  triggerReplay: () => Promise<void>;
  /** Skip replay (marks as complete) */
  skipReplay: () => void;
}

/**
 * Hook for replaying command board events
 *
 * Fetches recent events from the server and applies them to the board state,
 * providing users with context for what happened before they joined.
 */
export function useReplayEvents({
  boardId,
  enabled = true,
  maxEvents = 100,
  onApplyEvents,
  onReplayComplete,
}: UseReplayEventsOptions): UseReplayEventsResult {
  const [state, setState] = useState<ReplayState>("idle");
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const replayStartedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch replay events from the server
   */
  const fetchReplayEvents = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/command-board/${boardId}/replay?limit=${maxEvents}`
      );

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Failed to fetch replay events");
      }

      const result = (await response.json()) as {
        data: {
          events: ReplayEvent[];
          totalCount: number;
          hasMore: boolean;
        };
      };

      return result.data;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Unknown error");
    }
  }, [boardId, maxEvents]);

  /**
   * Process events in batches for smooth playback
   */
  const processEvents = useCallback(
    async (events: ReplayEvent[]): Promise<void> => {
      const batchSize = 10; // Process 10 events at a time
      const delay = 50; // 50ms delay between batches

      for (let i = 0; i < events.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const batch = events.slice(i, i + batchSize);
        onApplyEvents?.(batch);
        setProcessedCount(i + batch.length);

        // Small delay for visual effect
        if (i + batchSize < events.length) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    },
    [onApplyEvents]
  );

  /**
   * Trigger replay manually
   */
  const triggerReplay = useCallback(async () => {
    if (!enabled || replayStartedRef.current) {
      return;
    }

    replayStartedRef.current = true;
    abortControllerRef.current = new AbortController();

    setState("fetching");
    setError(null);

    try {
      const data = await fetchReplayEvents();

      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      const { events, totalCount: total } = data;

      if (events.length === 0) {
        setState("completed");
        onReplayComplete?.();
        return;
      }

      setTotalCount(total);
      setState("replaying");

      await processEvents(events);

      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setState("completed");
      onReplayComplete?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to replay events";
      setError(errorMessage);
      setState("error");
    } finally {
      abortControllerRef.current = null;
    }
  }, [enabled, fetchReplayEvents, processEvents, onReplayComplete]);

  /**
   * Skip replay (user opted out)
   */
  const skipReplay = useCallback(() => {
    abortControllerRef.current?.abort();
    setState("completed");
    onReplayComplete?.();
  }, [onReplayComplete]);

  /**
   * Auto-start replay on mount if enabled
   */
  useEffect(() => {
    if (enabled && boardId && !replayStartedRef.current) {
      triggerReplay();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [enabled, boardId, triggerReplay]);

  return {
    state,
    processedCount,
    totalCount,
    error,
    isReplaying: state === "fetching" || state === "replaying",
    triggerReplay,
    skipReplay,
  };
}
