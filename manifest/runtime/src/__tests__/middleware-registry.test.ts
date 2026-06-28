/**
 * Tests for the first-class middleware registry.
 *
 * These prove the registry is the single, internally-consistent source of truth
 * for every cross-entity reaction: unique names, complete contracts, async
 * entries matched by handlers, and correct query results. They also assert the
 * registry stays in sync with the async handler map (the wiring seam) so drift
 * is caught in CI, not in production.
 */
import { describe, expect, it } from "vitest";
import {
  ASYNC_REACTION_HANDLER_MAP,
} from "../async-reactions/handler-map";
import {
  DEFAULT_REGISTRY_RETRY_POLICY,
  MIDDLEWARE_REGISTRY,
  assertRegistryIntegrity,
  diffRegistryVsWiring,
  findReactionsTargetingEntity,
  findReactionsTriggeredByEvent,
  getAsyncRegistryEntries,
  getMiddlewareRegistry,
  getRegistryByCategory,
  getRegistryEntry,
  getTwoHookRegistryEntries,
} from "../middleware/middleware-registry";

describe("middleware registry — structural integrity", () => {
  it("passes the built-in integrity assertion", () => {
    expect(() => assertRegistryIntegrity()).not.toThrow();
  });

  it("has unique entry names (no duplicate-execution risk)", () => {
    const names = MIDDLEWARE_REGISTRY.map((e) => e.name);
    const duplicates = names.filter(
      (n, i) => names.indexOf(n) !== i
    );
    expect(duplicates).toEqual([]);
  });

  it("declares a non-empty triggeringEvents array for every non-cross-cutting entry", () => {
    for (const entry of MIDDLEWARE_REGISTRY) {
      if (entry.category === "cross-cutting") continue;
      expect(
        entry.triggeringEvents.length,
        `${entry.name} must declare triggering events`
      ).toBeGreaterThan(0);
    }
  });

  it("every entry declares all five contract dimensions", () => {
    for (const entry of MIDDLEWARE_REGISTRY) {
      // 1. triggering event
      expect(entry, `${entry.name}.triggeringEvents`).toHaveProperty(
        "triggeringEvents"
      );
      // 2. target command
      expect(entry.targetEntity, `${entry.name}.targetEntity`).toBeTruthy();
      expect(entry.targetCommand, `${entry.name}.targetCommand`).toBeTruthy();
      // 3. input mapping
      expect(entry.inputMapping, `${entry.name}.inputMapping`).toBeTruthy();
      // 4. idempotency key
      expect(entry.idempotencyKey, `${entry.name}.idempotencyKey`).toBeDefined();
      // 5. execution mode
      expect(["sync", "async"], `${entry.name}.executionMode`).toContain(
        entry.executionMode
      );
    }
  });

  it("every async entry has an asyncReactionName and a retry policy", () => {
    for (const entry of getAsyncRegistryEntries()) {
      expect(
        entry.asyncReactionName,
        `${entry.name} (async) must declare asyncReactionName`
      ).toBeTruthy();
      expect(
        entry.retryPolicy,
        `${entry.name} (async) must declare retryPolicy`
      ).toBeDefined();
    }
  });

  it("no two-hook entry is async (state-capture contract)", () => {
    for (const entry of getTwoHookRegistryEntries()) {
      expect(
        entry.executionMode,
        `${entry.name} is two-hook and must stay sync`
      ).toBe("sync");
    }
  });

  it("every per-target idempotency key is paired with a 1:N fan-out mapping", () => {
    for (const entry of MIDDLEWARE_REGISTRY) {
      const key = entry.idempotencyKey;
      if ("perTarget" in key && key.perTarget) {
        // Per-target keys only make sense for fan-out / multi-leg mappings
        expect(
          ["1:N-fan-out", "multi-leg", "load-and-derive", "recompute"],
          `${entry.name} declares perTarget key`
        ).toContain(entry.inputMapping);
      }
    }
  });
});

describe("middleware registry — query API", () => {
  it("getMiddlewareRegistry returns the full declaration list", () => {
    const all = getMiddlewareRegistry();
    expect(all.length).toBe(MIDDLEWARE_REGISTRY.length);
    expect(all.length).toBeGreaterThan(40);
  });

  it("getRegistryEntry finds by name", () => {
    const payment = getRegistryEntry("payment-processed-invoice-apply");
    expect(payment?.targetEntity).toBe("Invoice");
    expect(payment?.targetCommand).toBe("applyPayment");
    expect(payment?.executionMode).toBe("async");
  });

  it("findReactionsTriggeredByEvent answers the core audit query", () => {
    const triggeredByPaymentProcessed = findReactionsTriggeredByEvent(
      "PaymentProcessed"
    );
    const names = triggeredByPaymentProcessed.map((e) => e.name);
    expect(names).toContain("payment-processed-invoice-apply");

    // EventCancelled has exactly one cascading reaction
    const cancelled = findReactionsTriggeredByEvent("EventCancelled");
    expect(cancelled.map((e) => e.name)).toEqual(["event-cancelled-cascade"]);
  });

  it("findReactionsTargetingEntity answers the inverse audit query", () => {
    const invoiceWriters = findReactionsTargetingEntity("Invoice");
    const names = invoiceWriters.map((e) => e.name);
    expect(names).toContain("payment-processed-invoice-apply");
    expect(names).toContain("invoice-fully-paid-mark-paid");
    expect(names).toContain("collection-payment-recorded-invoice-apply");
  });

  it("getRegistryByCategory groups every entry", () => {
    const grouped = getRegistryByCategory();
    let total = 0;
    for (const entries of grouped.values()) total += entries.length;
    expect(total).toBe(MIDDLEWARE_REGISTRY.length);
    expect(grouped.get("finance")?.length).toBeGreaterThan(0);
    expect(grouped.get("events")?.length).toBeGreaterThan(0);
  });

  it("getAsyncRegistryEntries returns only async entries", () => {
    for (const entry of getAsyncRegistryEntries()) {
      expect(entry.executionMode).toBe("async");
      expect(entry.asyncReactionName).toBeTruthy();
    }
    // The feature named 20 async reactions (2 pilots + 18)
    expect(getAsyncRegistryEntries().length).toBeGreaterThanOrEqual(20);
  });
});

describe("middleware registry — registry ↔ async handler map sync", () => {
  /**
   * The critical guard: every async declaration has a handler, and every handler
   * has a declaration. Catches the silent "async reaction never runs" and
   * "handler wired but invisible to audit" bug classes.
   */
  it("every async registry entry has a matching handler", () => {
    const handlerNames = new Set(
      ASYNC_REACTION_HANDLER_MAP.map((h) => h.name)
    );
    for (const entry of getAsyncRegistryEntries()) {
      expect(
        handlerNames.has(entry.asyncReactionName!),
        `${entry.name} (asyncReactionName=${entry.asyncReactionName}) has no handler in ASYNC_REACTION_HANDLER_MAP`
      ).toBe(true);
    }
  });

  it("every handler has a matching async registry entry", () => {
    const declaredAsyncNames = new Set(
      getAsyncRegistryEntries().map((e) => e.asyncReactionName)
    );
    for (const handler of ASYNC_REACTION_HANDLER_MAP) {
      expect(
        declaredAsyncNames.has(handler.name),
        `handler "${handler.name}" has no async declaration in MIDDLEWARE_REGISTRY`
      ).toBe(true);
    }
  });

  it("handler count equals async declaration count", () => {
    expect(ASYNC_REACTION_HANDLER_MAP.length).toBe(
      getAsyncRegistryEntries().length
    );
  });

  it("every handler exposes a function", () => {
    for (const h of ASYNC_REACTION_HANDLER_MAP) {
      expect(typeof h.handler).toBe("function");
      expect(h.description.length).toBeGreaterThan(0);
    }
  });
});

describe("middleware registry — wiring completeness validation", () => {
  it("diffRegistryVsWiring flags wired-but-not-declared names", () => {
    const drift = diffRegistryVsWiring([
      ...MIDDLEWARE_REGISTRY.map((e) => e.name),
      "ghost-middleware-not-in-registry",
    ]);
    expect(drift.wiredButNotDeclared).toEqual([
      "ghost-middleware-not-in-registry",
    ]);
    expect(drift.declaredButNotWired).toEqual([]);
  });

  it("diffRegistryVsWiring flags declared-but-not-wired names", () => {
    const partial = MIDDLEWARE_REGISTRY.slice(0, 5).map((e) => e.name);
    const drift = diffRegistryVsWiring(partial);
    expect(drift.wiredButNotDeclared).toEqual([]);
    expect(drift.declaredButNotWired.length).toBe(
      MIDDLEWARE_REGISTRY.length - 5
    );
  });

  it("diffRegistryVsWiring is clean when the sets match", () => {
    const all = MIDDLEWARE_REGISTRY.map((e) => e.name);
    const drift = diffRegistryVsWiring(all);
    expect(drift.wiredButNotDeclared).toEqual([]);
    expect(drift.declaredButNotWired).toEqual([]);
  });

  it("DEFAULT_REGISTRY_RETRY_POLICY has the expected shape", () => {
    expect(DEFAULT_REGISTRY_RETRY_POLICY.maxAttempts).toBe(5);
    expect(DEFAULT_REGISTRY_RETRY_POLICY.initialBackoffMs).toBe(1_000);
    expect(DEFAULT_REGISTRY_RETRY_POLICY.maxBackoffMs).toBe(60_000);
  });
});

describe("middleware registry — feature rationale coverage", () => {
  /**
   * The feature explicitly names payment→invoice and shipment→inventory as the
   * motivating examples. Both must be present and correctly declared.
   */
  it("covers the payment→invoice example named in the feature rationale", () => {
    const entry = getRegistryEntry("payment-processed-invoice-apply");
    expect(entry).toBeDefined();
    expect(entry!.triggeringEvents).toContain("PaymentProcessed");
    expect(entry!.targetEntity).toBe("Invoice");
    expect(entry!.targetCommand).toBe("applyPayment");
    expect("template" in entry!.idempotencyKey).toBe(true);
  });

  it("covers the shipment→inventory example named in the feature rationale", () => {
    const entry = getRegistryEntry(
      "shipment-item-received-inventory-restock"
    );
    expect(entry).toBeDefined();
    expect(entry!.triggeringEvents).toContain("ShipmentItemReceived");
    expect(entry!.targetEntity).toBe("InventoryItem");
    expect(entry!.targetCommand).toBe("restock");
  });

  it("is trivially auditable which cross-entity mutations exist", () => {
    // The audit surface: count of distinct declared propagations
    const all = getMiddlewareRegistry();
    const crossEntity = all.filter(
      (e) => e.category !== "cross-cutting" && e.category !== "onboarding"
    );
    expect(crossEntity.length).toBeGreaterThan(30);
    // Every one names a target command (the governed mutation)
    for (const e of crossEntity) {
      const cmd = e.targetCommand;
      const len = Array.isArray(cmd) ? cmd.length : cmd.length;
      expect(len, `${e.name} must declare a target command`).toBeGreaterThan(0);
    }
  });
});
