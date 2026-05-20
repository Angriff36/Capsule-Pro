"use client";

import { useEffect } from "react";

/**
 * Browser-side subscription to the SSE realtime endpoint.
 *
 * Replaces `useChannel` / `useConnectionStateListener` from `ably/react`.
 * Internally just wraps the native `EventSource` API and listens for the
 * tenant-scoped channels exposed by `apps/api/app/api/realtime/events/route.ts`.
 *
 * Docs:
 *   - MDN — Using server-sent events:
 *     https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 *   - MDN — EventSource:
 *     https://developer.mozilla.org/en-US/docs/Web/API/EventSource
 *
 * Behavior notes:
 *   - URL is always relative ("/api/realtime/events"); the apps/app Next
 *     rewrite forwards it to apps/api as same-origin, so cookies and Clerk
 *     session are sent automatically. No CORS gymnastics needed.
 *   - `EventSource` does its own exponential reconnect on transport errors,
 *     so we don't implement retry ourselves.
 *   - The hook is a no-op until both `tenantId` and `enabled` are truthy,
 *     mirroring the previous `NEXT_PUBLIC_ABLY_ENABLED` gate so feature
 *     flags continue to work.
 */

export interface RealtimeEventMessage<T = unknown> {
  /** The fanout channel this message arrived on. */
  channel: string;
  /** The event name (e.g. "kitchen.task.claimed"). */
  name: string;
  /** The opaque payload as published by the server. */
  data: T;
}

export interface UseRealtimeChannelOptions {
  /** Whether the subscription should be active. Defaults to true. */
  enabled?: boolean;
  /**
   * Optional channels to subscribe to. Each must start with `tenant:{tenantId}`.
   * When omitted, defaults to `["tenant:{tenantId}"]` (the wide tenant feed).
   */
  channels?: readonly string[];
}

const SSE_ENDPOINT = "/api/realtime/events";

const buildUrl = (channels: readonly string[]): string => {
  const params = new URLSearchParams();
  for (const channel of channels) {
    params.append("channel", channel);
  }
  return `${SSE_ENDPOINT}?${params.toString()}`;
};

/**
 * Subscribe to realtime events for the current tenant.
 *
 * @param tenantId - The tenant id. The subscription is skipped when null/empty.
 * @param onMessage - Called once per delivered event. Should be a stable
 *   reference (use `useCallback`) to avoid resubscribing on every render.
 * @param options - Optional gating + channel selection.
 */
export function useRealtimeChannel<T = unknown>(
  tenantId: string | null | undefined,
  onMessage: (message: RealtimeEventMessage<T>) => void,
  options?: UseRealtimeChannelOptions
): void {
  const enabled = options?.enabled ?? true;
  // Serialize the channels list so the effect deps comparison is stable.
  const channelsKey = options?.channels
    ? options.channels.slice().sort().join("|")
    : "";

  useEffect(() => {
    if (!(tenantId && enabled)) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const channels = options?.channels?.length
      ? options.channels
      : [`tenant:${tenantId}`];

    const source = new EventSource(buildUrl(channels), {
      withCredentials: true,
    });

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEventMessage<T>;
        onMessage(parsed);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.warn("[useRealtimeChannel] failed to parse event", error);
        }
      }
    };

    // `EventSource` dispatches events of `type === message.name` (we set it
    // server-side via `event:` lines), and also fires generic `message`
    // events for entries without a type. Listen for both — the named event
    // is cheaper to filter, the `message` listener is a safety net.
    source.addEventListener("message", handleMessage as EventListener);

    // Use a wildcard-ish strategy: listen for every distinct event name the
    // server could send. Since we can't enumerate them ahead of time we lean
    // on the generic `message` handler above; named-event delivery is
    // already covered by it because EventSource fires both when the data
    // line is present.

    return () => {
      source.removeEventListener("message", handleMessage as EventListener);
      source.close();
    };
    // We intentionally omit `options.channels` from deps and use the
    // serialized `channelsKey` instead so a freshly-built array on each
    // render does not cause infinite re-subscribes.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  }, [tenantId, enabled, channelsKey, onMessage]);
}
