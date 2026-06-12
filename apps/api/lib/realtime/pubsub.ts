/**
 * In-process pub/sub registry for SSE fanout.
 *
 * The publisher (outbox cron, admin chat POST) calls `publish()`; SSE route
 * handlers register subscribers via `subscribe()` and stream events to the
 * connected browser.
 *
 * Scope:
 *   This registry only fans out within a single Node.js process. On a
 *   single-instance deployment (or local dev) every publisher and every
 *   SSE connection share the same Map, so events flow end-to-end. On a
 *   multi-instance deployment (e.g. Vercel serverless with N parallel
 *   lambda invocations) a publisher running on instance A will not reach
 *   subscribers on instance B — that scenario needs a shared transport
 *   (Redis pub/sub, NATS, Postgres LISTEN/NOTIFY, etc.) wired through the
 *   same `publish` / `subscribe` API.
 *
 * Channel naming follows `packages/realtime` (`tenant:{tenantId}` and
 * `tenant:{tenantId}:admin-chat[:thread:{threadId}]`). The fanout layer
 * does not interpret channel structure; the SSE route filters by the
 * channel prefix(es) the client subscribed to.
 */

export interface RealtimeMessage {
  /** Event payload — opaque to the registry, serialized as JSON for SSE. */
  data: unknown;
  /** Event name (e.g. "kitchen.task.claimed", "admin.chat.message"). */
  name: string;
}

export type RealtimeListener = (
  channel: string,
  message: RealtimeMessage
) => void;

const channelListeners = new Map<string, Set<RealtimeListener>>();

/**
 * Publish a message to a channel. Returns the number of listeners notified.
 * Listener errors are caught so one bad subscriber cannot break fanout.
 */
export function publish(channel: string, message: RealtimeMessage): number {
  const listeners = channelListeners.get(channel);
  if (!listeners || listeners.size === 0) {
    return 0;
  }
  let delivered = 0;
  for (const listener of listeners) {
    try {
      listener(channel, message);
      delivered += 1;
    } catch (error) {
      // Don't let one bad subscriber break the rest.
      // eslint-disable-next-line no-console
      console.error("[realtime/pubsub] listener threw", error);
    }
  }
  return delivered;
}

/**
 * Subscribe to a single channel. Returns an unsubscribe function.
 */
export function subscribe(
  channel: string,
  listener: RealtimeListener
): () => void {
  let set = channelListeners.get(channel);
  if (!set) {
    set = new Set();
    channelListeners.set(channel, set);
  }
  set.add(listener);

  return () => {
    const current = channelListeners.get(channel);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      channelListeners.delete(channel);
    }
  };
}

/**
 * Subscribe to many channels at once. Returns a single unsubscribe function
 * that detaches the listener from every channel passed in.
 */
export function subscribeMany(
  channels: readonly string[],
  listener: RealtimeListener
): () => void {
  const offs = channels.map((channel) => subscribe(channel, listener));
  return () => {
    for (const off of offs) {
      off();
    }
  };
}

/** Test helper — number of distinct channels with at least one subscriber. */
export function _activeChannelCount(): number {
  return channelListeners.size;
}

/** Test helper — flush all listeners. Do not call in production code. */
export function _resetForTests(): void {
  channelListeners.clear();
}
