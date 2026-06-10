/**
 * Provenance verification tests.
 *
 * Verifies that the deterministic hash computation in loadManifests matches
 * the algorithm used by compile.mjs, so that IR integrity checking works
 * end-to-end: compile → store hash → load → verify hash.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { verifyProvenanceHash, invalidateMergedIRCache } from "@repo/manifest-runtime/runtime/loadManifests";
import { createHash } from "node:crypto";
import type { IR, IRType } from "@angriff36/manifest/ir";

/** Shorthand for a non-nullable string type. */
const STRING_TYPE: IRType = { name: "string", nullable: false };

/**
 * Deterministic JSON stringify matching the algorithm in loadManifests.ts
 * and compile.mjs — recursively sorts all object keys.
 */
function deterministicStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((sorted, key) => {
          sorted[key] = (value as Record<string, unknown>)[key];
          return sorted;
        }, {});
    }
    return value;
  });
}

/** Build a minimal IR with a specific irHash for testing. */
function makeIR(irHash = "", extra?: Partial<IR["provenance"]>): IR {
  const ir: IR = {
    version: "1.0",
    provenance: {
      contentHash: "test-content-hash",
      irHash,
      compilerVersion: "2.2.0",
      schemaVersion: "1.0",
      compiledAt: "2026-01-01T00:00:00.000Z",
      ...extra,
    },
    modules: [],
    entities: [
      {
        name: "TestEntity",
        properties: [
          { name: "id", type: STRING_TYPE, modifiers: ["required"] },
          { name: "name", type: STRING_TYPE, modifiers: [] },
        ],
        computedProperties: [],
        relationships: [],
        commands: [],
        constraints: [],
        policies: [],
      },
    ],
    stores: [],
    events: [],
    commands: [],
    policies: [],
    values: [],
    enums: [],
  };
  return ir;
}

/** Compute the expected irHash for an IR using the same algorithm. */
function computeExpectedHash(ir: IR): string {
  const canonical = JSON.parse(JSON.stringify(ir)) as IR;
  if (canonical.provenance) {
    canonical.provenance.irHash = "";
  }
  return createHash("sha256")
    .update(deterministicStringify(canonical))
    .digest("hex");
}

describe("verifyProvenanceHash", () => {
  beforeEach(() => {
    // Reset the module-level provenance cache so each test starts fresh.
    invalidateMergedIRCache();
  });

  it("returns valid=true when irHash matches deterministic computation", () => {
    const ir = makeIR();
    const expectedHash = computeExpectedHash(ir);
    ir.provenance!.irHash = expectedHash;

    const result = verifyProvenanceHash(ir);

    expect(result.valid).toBe(true);
    expect(result.storedHash).toBe(expectedHash);
    expect(result.computedHash).toBe(expectedHash);
    expect(result.error).toBeUndefined();
  });

  it("returns valid=false when irHash does not match", () => {
    const ir = makeIR("tampered-hash-value");

    const result = verifyProvenanceHash(ir);

    expect(result.valid).toBe(false);
    expect(result.storedHash).toBe("tampered-hash-value");
    expect(result.computedHash).not.toBe("tampered-hash-value");
    expect(result.error).toContain("IR provenance verification failed");
  });

  it("returns valid=false with error when irHash is empty", () => {
    const ir = makeIR("");

    const result = verifyProvenanceHash(ir);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("No irHash in provenance");
  });

  it("returns valid=false when provenance is missing entirely", () => {
    const ir = makeIR();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (ir as any).provenance;

    const result = verifyProvenanceHash(ir);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("No irHash in provenance");
  });

  it("caches the result on subsequent calls", () => {
    const ir = makeIR();
    const expectedHash = computeExpectedHash(ir);
    ir.provenance!.irHash = expectedHash;

    const result1 = verifyProvenanceHash(ir);
    const result2 = verifyProvenanceHash(ir);

    expect(result1).toBe(result2); // Same object reference — cached
  });

  it("produces same hash regardless of property insertion order", () => {
    // Two IRs with the same content but different key orders should hash identically.
    const ir1 = makeIR();
    const hash1 = computeExpectedHash(ir1);

    // Manually build a "scrambled" version with reversed entity properties
    const ir2: IR = {
      version: "1.0",
      provenance: {
        irHash: "",
        schemaVersion: "1.0",
        compilerVersion: "2.2.0",
        compiledAt: "2026-01-01T00:00:00.000Z",
        contentHash: "test-content-hash",
      },
      enums: [],
      values: [],
      policies: [],
      commands: [],
      events: [],
      stores: [],
      entities: [
        {
          policies: [],
          constraints: [],
          relationships: [],
          computedProperties: [],
          commands: [],
          properties: [
            { name: "id", type: STRING_TYPE, modifiers: ["required"] },
            { name: "name", type: STRING_TYPE, modifiers: [] },
          ],
          name: "TestEntity",
        },
      ],
      modules: [],
    };
    const hash2 = computeExpectedHash(ir2);

    expect(hash1).toBe(hash2);
  });
});
