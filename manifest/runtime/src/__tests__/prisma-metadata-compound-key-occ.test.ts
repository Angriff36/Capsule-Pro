/**
 * Regression guard: compound-key Prisma models must NOT carry `versionProperty`
 * in the generated metadata.
 *
 * WHY: @angriff36/manifest `GenericPrismaStore.update` builds a broken
 * optimistic-lock WHERE for compound-key entities — it stuffs the version into
 * the `tenantId_id` compound selector, Prisma rejects the unknown `version`
 * argument, and the store's `catch { return undefined }` silently drops the
 * write while the runtime still emits the event and returns 200 (fake success,
 * lost edit). `generate-prisma-model-metadata.mjs` therefore omits
 * `versionProperty` for any model whose pk is composite, routing those updates
 * through the plain persisting write path. This test fails if that guard is
 * removed or a regeneration reintroduces the broken opt-in — exactly the bug
 * that made Event/Invoice/Payment/etc. edits silently disappear.
 *
 * Engine-level optimistic concurrency (version auto-increment + VERSION_MISMATCH
 * detection) is unaffected and proven separately in entity-concurrency.test.ts.
 */
import { describe, expect, it } from "vitest";
import { PRISMA_MODEL_METADATA } from "../generated/prisma-model-metadata.generated";

// The known versioned + compound-key entities (the silent-data-loss blast radius).
const COMPOUND_VERSIONED_ENTITIES = [
  "Event",
  "Invoice",
  "Payment",
  "InventoryItem",
  "CateringOrder",
  "VendorContract",
  "ScheduleShift",
  "EventGuest",
];

describe("compound-key OCC is not opted into (silent-write-loss guard)", () => {
  it("never emits versionProperty for any compound-key model", () => {
    const offenders = Object.entries(PRISMA_MODEL_METADATA)
      .filter(([, m]) => m.pkFields.length > 1 && m.versionProperty != null)
      .map(([name, m]) => `${name} (pk=${m.pkFields.join("+")})`);
    expect(
      offenders,
      `compound-key models must omit versionProperty (broken package OCC): ${offenders.join(", ")}`
    ).toEqual([]);
  });

  it("keeps the version column but omits versionProperty for the known affected entities", () => {
    for (const name of COMPOUND_VERSIONED_ENTITIES) {
      const meta = PRISMA_MODEL_METADATA[name];
      expect(meta, `${name} should exist in metadata`).toBeTruthy();
      expect(
        meta.pkFields.length,
        `${name} should be compound-key`
      ).toBeGreaterThan(1);
      expect(
        meta.versionProperty,
        `${name} must not opt into broken compound-key OCC`
      ).toBeUndefined();
      // The version column itself must remain (still increments via the engine).
      expect(
        meta.fields.some((f) => f.name === "version" || f.irName === "version"),
        `${name} should still carry a version column`
      ).toBe(true);
    }
  });
});
