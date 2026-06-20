import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import type { EntityInstance } from "../prisma-store.js";
import {
  createRequestStoreReadCache,
  wrapStoreWithRequestCache,
} from "../request-scoped-store-cache.js";

/**
 * Minimal in-memory Store that counts how many times each method reaches the
 * "database", so a test can assert duplicate reads were collapsed.
 */
function makeCountingStore(seed: Record<string, EntityInstance> = {}): {
  store: Store<EntityInstance>;
  calls: { getById: number; getAll: number; update: number; create: number };
} {
  const rows = new Map<string, EntityInstance>(Object.entries(seed));
  const calls = { getById: 0, getAll: 0, update: 0, create: 0 };
  const store: Store<EntityInstance> = {
    getAll: async () => {
      calls.getAll++;
      return [...rows.values()];
    },
    getById: async (id) => {
      calls.getById++;
      return rows.get(id);
    },
    create: async (data) => {
      calls.create++;
      const row = { ...(data as EntityInstance) };
      rows.set(row.id, row);
      return row;
    },
    update: async (id, data) => {
      calls.update++;
      const existing = rows.get(id);
      if (!existing) {
        return undefined;
      }
      const next = { ...existing, ...data };
      rows.set(id, next);
      return next;
    },
    delete: async (id) => rows.delete(id),
    clear: async () => {
      rows.clear();
    },
  };
  return { store, calls };
}

describe("wrapStoreWithRequestCache", () => {
  it("serves repeated getById from cache (one DB hit per id)", async () => {
    const { store, calls } = makeCountingStore({ e1: { id: "e1", name: "a" } });
    const cached = wrapStoreWithRequestCache(
      store,
      "Event",
      createRequestStoreReadCache()
    );

    const a = await cached.getById("e1");
    const b = await cached.getById("e1");
    const c = await cached.getById("e1");

    expect(a?.name).toBe("a");
    expect(b).toBe(a); // same resolved reference
    expect(c).toBe(a);
    expect(calls.getById).toBe(1); // only the first call reached the store
  });

  it("dedups concurrent getById into a single in-flight load", async () => {
    const { store, calls } = makeCountingStore({ e1: { id: "e1" } });
    const cached = wrapStoreWithRequestCache(
      store,
      "Event",
      createRequestStoreReadCache()
    );

    const [x, y] = await Promise.all([
      cached.getById("e1"),
      cached.getById("e1"),
    ]);
    expect(x).toBe(y);
    expect(calls.getById).toBe(1);
  });

  it("invalidates on update so read-after-write is fresh, not stale", async () => {
    const { store, calls } = makeCountingStore({
      e1: { id: "e1", status: "draft" },
    });
    const cached = wrapStoreWithRequestCache(
      store,
      "Event",
      createRequestStoreReadCache()
    );

    const before = await cached.getById("e1");
    expect(before?.status).toBe("draft");

    await cached.update("e1", { status: "confirmed" });

    const after = await cached.getById("e1");
    expect(after?.status).toBe("confirmed"); // not the stale cached "draft"
    expect(calls.getById).toBe(2); // re-queried after the write
  });

  it("scopes cache keys by entity (same id, different entity)", async () => {
    const event = makeCountingStore({ x: { id: "x", kind: "event" } });
    const invoice = makeCountingStore({ x: { id: "x", kind: "invoice" } });
    const cache = createRequestStoreReadCache();
    const cachedEvent = wrapStoreWithRequestCache(event.store, "Event", cache);
    const cachedInvoice = wrapStoreWithRequestCache(
      invoice.store,
      "Invoice",
      cache
    );

    expect((await cachedEvent.getById("x"))?.kind).toBe("event");
    expect((await cachedInvoice.getById("x"))?.kind).toBe("invoice");
    expect(event.calls.getById).toBe(1);
    expect(invoice.calls.getById).toBe(1);
  });

  it("evicts a failed load so a later read retries", async () => {
    let attempt = 0;
    const store: Store<EntityInstance> = {
      getAll: async () => [],
      getById: async (id) => {
        attempt++;
        if (attempt === 1) {
          throw new Error("transient");
        }
        return { id };
      },
      create: async (d) => d as EntityInstance,
      update: async () => undefined,
      delete: async () => false,
      clear: async () => {},
    };
    const cached = wrapStoreWithRequestCache(
      store,
      "Event",
      createRequestStoreReadCache()
    );

    await expect(cached.getById("e1")).rejects.toThrow("transient");
    // The rejection must NOT be pinned in the cache — a retry re-queries.
    const ok = await cached.getById("e1");
    expect(ok?.id).toBe("e1");
    expect(attempt).toBe(2);
  });
});
