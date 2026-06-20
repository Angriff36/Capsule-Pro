/**
 * Request-scoped store read cache (a per-request DataLoader for subject loads).
 *
 * A single `RuntimeEngine.runCommand` can fan out to ~20 cross-entity reactions,
 * and the triggering subject, the parent-context resolver, and every fired
 * reaction/middleware all reload the SAME `(entity, id)` via `Store.getById`.
 * Without caching, each reload is a separate Prisma `findUnique` — an N+1 read
 * pattern that grows with the length of the reaction chain.
 *
 * This module wraps a `Store` so `getById` is memoized for the life of one
 * request and invalidated on every write, eliminating those duplicate reads.
 *
 * @packageDocumentation
 */

import type { Store } from "@angriff36/manifest";
import type { EntityInstance } from "./prisma-store";

/**
 * A request-scoped read cache shared across every `Store` handed out by one
 * `buildStoreProvider` call. Keyed by `${entityName}:${id}`; the value is the
 * in-flight (or resolved) `getById` promise so concurrent loads share one query.
 */
export type RequestStoreReadCache = Map<
  string,
  Promise<EntityInstance | undefined>
>;

/** Create an empty request-scoped read cache. */
export function createRequestStoreReadCache(): RequestStoreReadCache {
  return new Map();
}

/**
 * Wrap a `Store` so `getById` reads are memoized in a request-scoped cache and
 * any write invalidates the cached read for the affected id.
 *
 * Behaviour:
 * - Concurrent `getById(sameKey)` calls share the in-flight promise (DataLoader-
 *   style dedup within a tick); resolved subjects are reused for the rest of the
 *   request.
 * - `create`/`update`/`delete` drop the affected id's cached read, and `clear`
 *   flushes the whole entity — so a read-after-write inside the same cascade
 *   (e.g. a count-sync middleware that loads → mutates → reloads) always sees the
 *   fresh subject, never a stale one.
 * - A rejected load is evicted so a later read retries instead of replaying the
 *   failure.
 *
 * ponytail: dedup + per-request cache only. True cross-id IN-clause batching
 * would need a `getByIds` store seam and only helps CONCURRENT distinct-id loads,
 * which the sequential reaction await-chain rarely issues — add it if profiling
 * shows the need.
 */
export function wrapStoreWithRequestCache(
  store: Store<EntityInstance>,
  entityName: string,
  cache: RequestStoreReadCache
): Store<EntityInstance> {
  const keyFor = (id: string): string => `${entityName}:${id}`;
  return {
    getAll: () => store.getAll(),
    getById: (id: string) => {
      const key = keyFor(id);
      let pending = cache.get(key);
      if (!pending) {
        pending = store.getById(id);
        cache.set(key, pending);
        // Evict a rejected load so a later read retries instead of replaying the
        // rejection; identity-guarded so a newer entry is never dropped.
        pending.catch(() => {
          if (cache.get(key) === pending) {
            cache.delete(key);
          }
        });
      }
      return pending;
    },
    create: async (data) => {
      const created = await store.create(data);
      if (typeof created?.id === "string") {
        cache.delete(keyFor(created.id));
      }
      return created;
    },
    update: async (id, data) => {
      const updated = await store.update(id, data);
      cache.delete(keyFor(id));
      return updated;
    },
    delete: async (id) => {
      const deleted = await store.delete(id);
      cache.delete(keyFor(id));
      return deleted;
    },
    clear: async () => {
      await store.clear();
      const prefix = `${entityName}:`;
      for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
          cache.delete(key);
        }
      }
    },
  };
}
