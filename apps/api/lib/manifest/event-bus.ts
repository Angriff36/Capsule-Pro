/**
 * Redis event bus for cross-instance realtime (Manifest Phase 6).
 *
 * The in-process pub/sub (@/lib/realtime/pubsub) only reaches SSE subscribers
 * on the SAME Vercel instance. This module wires Manifest's RedisEventBus so
 * engine-emitted events cross instances:
 *
 *   engine (RuntimeOptions.eventBus) ──publish──▶ Redis channel
 *   manifest:events:{tenantId} ──subscribe──▶ SSE route streams to browsers
 *
 * Per-tenant channels are mandatory: EmittedEvent carries no tenantId, so
 * isolation must come from the channel name, not message filtering.
 *
 * Everything degrades to a no-op when REDIS_URL is unset (local dev, CI):
 * the engine simply publishes to nothing and SSE falls back to the
 * in-process pub/sub + outbox-cron path, exactly as before.
 *
 * Connection model: ONE shared ioredis publisher client per server instance
 * (the engine is constructed per request — per-request connections would
 * churn); RedisEventBus instances receive the shared client and therefore
 * never own/quit it. Each SSE stream's subscribe() opens a dedicated
 * subscriber connection via client.duplicate() (Redis subscriber-mode
 * requirement) which closes with the stream.
 */

import type { EventBus } from "@angriff36/manifest/events";
import {
  RedisEventBus,
  type RedisEventBusClient,
} from "@angriff36/manifest/events/redis";
import { log } from "@repo/observability/log";

let sharedClient: RedisEventBusClient | null | undefined;
const busByTenant = new Map<string, EventBus>();

function getSharedClient(): RedisEventBusClient | null {
  if (sharedClient !== undefined) {
    return sharedClient;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    sharedClient = null;
    return sharedClient;
  }
  try {
    // Lazy require keeps ioredis (an optional peer of @angriff36/manifest)
    // out of cold paths when REDIS_URL is unset.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis") as new (
      url: string,
      opts?: Record<string, unknown>
    ) => RedisEventBusClient;
    sharedClient = new Redis(url, {
      // Fail fast instead of queueing commands forever on a bad URL/network.
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });
  } catch (error) {
    log.error("[event-bus] failed to create Redis client — realtime bus disabled", {
      error: error instanceof Error ? error.message : String(error),
    });
    sharedClient = null;
  }
  return sharedClient;
}

/** Redis channel carrying a tenant's engine event batches. */
export function tenantEventChannel(tenantId: string): string {
  return `manifest:events:${tenantId}`;
}

/**
 * Per-tenant EventBus backed by the shared Redis connection, or undefined when
 * REDIS_URL is unset. Pass the result to the runtime factory's `eventBus` dep
 * (publish side) or subscribe() from the SSE route (delivery side).
 */
export function getTenantEventBus(tenantId: string): EventBus | undefined {
  const client = getSharedClient();
  if (!client) {
    return undefined;
  }
  let bus = busByTenant.get(tenantId);
  if (!bus) {
    bus = new RedisEventBus({ client, channel: tenantEventChannel(tenantId) });
    busByTenant.set(tenantId, bus);
  }
  return bus;
}
