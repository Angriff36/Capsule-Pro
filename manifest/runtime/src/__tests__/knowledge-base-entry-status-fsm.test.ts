/**
 * Conformance — WS7 enum pilot: retyping `KnowledgeBaseEntry.status` from
 * `string` to the `KnowledgeBaseEntryStatus` enum does NOT change how the
 * runtime enforces state transitions (Phase-0 preflight P3, gates WS7).
 *
 * WHY this matters (not just WHAT): the Manifest runtime validates EVERY status
 * mutation against the declared `transition` edges, matching the current value
 * and the mutate target against the `from`/`to` STRINGS in the IR. P3's risk
 * was that retyping the property to an enum could make that match compare enum
 * objects/members against strings and silently break every transition on the
 * retyped entity. It does not: the enum members (`draft`/`published`/`archived`)
 * serialize to the exact same strings the transition table and the `self.status`
 * guards use, so FSM enforcement is unchanged. This is the FIRST runtime proof
 * of enum-typed status enforcement and the template every WS7 domain batch
 * relies on (each `status: string -> enum` retype keeps this string-based
 * transition contract).
 *
 * Declared transition table (kitchen.ir.json):
 *   draft     -> [published, archived]
 *   published -> [draft, archived]
 *   archived  -> []  (terminal — no outgoing edge)
 *
 * Each test seeds the precondition row directly in the store (isolated infra
 * setup, constitution §13) and drives the real command through the production
 * `ManifestRuntimeEngine` + compiled IR, asserting valid edges are ACCEPTED and
 * PERSISTED (the enum value lands as its string name) and invalid attempts are
 * still REJECTED. Deploy-free (in-memory store); the Postgres enum-column
 * migration is awaited human deploy and is not exercised here.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-kb-enum-fsm";
const USER = { id: "u-admin", tenantId: TENANT, role: "admin" } as const;

/** Minimal persistent in-memory store (mirrors the upstream MemoryStore contract). */
class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async clear(): Promise<void> {
    this.items.clear();
  }
}

function makeProvider(): (entity: string) => Store {
  const stores = new Map<string, Mem>();
  return (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  return new ManifestRuntimeEngine(
    ir,
    {
      tenantId: TENANT,
      user: { id: USER.id, tenantId: TENANT, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
}

/**
 * Seed a KnowledgeBaseEntry row at a given status (precondition setup, not the
 * behaviour under test). `validCategory` is the entity's only block constraint
 * and is checked on every command, so category must be a valid member; title/
 * content are non-empty so publishEntry's guards can pass when status is draft.
 */
async function seedEntry(
  provider: (entity: string) => Store,
  status: string
): Promise<string> {
  const id = randomUUID();
  await provider("KnowledgeBaseEntry").create({
    id,
    tenantId: TENANT,
    title: "Onboarding Guide",
    slug: "onboarding-guide",
    category: "procedures",
    content: "Welcome to the team.",
    tags: [],
    status,
    authorId: USER.id,
    publishedAt: null,
    viewCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
  } as never);
  return id;
}

function run(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "KnowledgeBaseEntry",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural IR.
function kbEntity(): any {
  return Array.isArray(ir.entities)
    ? ir.entities.find((x: any) => x.name === "KnowledgeBaseEntry")
    : ir.entities.KnowledgeBaseEntry;
}

describe("Conformance: WS7 enum-typed status still enforces transitions (P3)", () => {
  it("IR types status as the enum and keeps transitions string-based", () => {
    const ent = kbEntity();
    // Property retyped from string to the enum.
    const status = ent.properties.find(
      (p: { name: string }) => p.name === "status"
    );
    expect(status.type.name).toBe("KnowledgeBaseEntryStatus");

    // Enum declared with the three members.
    const enumBlock = (ir.enums ?? []).find(
      (e: { name: string }) => e.name === "KnowledgeBaseEntryStatus"
    );
    expect(enumBlock?.values?.map((v: { name: string }) => v.name)).toEqual(
      expect.arrayContaining(["draft", "published", "archived"])
    );

    // P3 core claim: transitions are still STRING-keyed (from/to are strings),
    // structurally identical to a string-typed status — the retyping did not
    // alter the transition representation.
    const byFrom = new Map<string, string[]>();
    for (const t of ent.transitions ?? []) {
      if ((t.property ?? "status") === "status") {
        byFrom.set(t.from, t.to);
      }
    }
    expect(byFrom.get("draft")).toEqual(
      expect.arrayContaining(["published", "archived"])
    );
    expect(byFrom.get("published")).toEqual(
      expect.arrayContaining(["draft", "archived"])
    );
    expect(byFrom.has("archived")).toBe(false); // terminal — no outgoing edge
  });

  it("publishEntry moves a draft entry to published (draft -> published) and persists the enum value as its string name", async () => {
    const provider = makeProvider();
    const id = await seedEntry(provider, "draft");
    const engine = newEngine(provider);

    const result = await run(engine, "publishEntry", { id });

    expect(result.ok).toBe(true);
    const row = (await provider("KnowledgeBaseEntry").getById(id)) as Record<
      string,
      unknown
    >;
    // Enum member serializes to the same string the transition table uses.
    expect(row.status).toBe("published");
    expect(row.publishedAt).not.toBeNull();
  });

  it("unpublish moves a published entry back to draft (published -> draft)", async () => {
    const provider = makeProvider();
    const id = await seedEntry(provider, "published");
    const engine = newEngine(provider);

    const result = await run(engine, "unpublish", {
      id,
      reason: "needs revision",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("KnowledgeBaseEntry").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("draft");
  });

  it("remove archives a draft entry (draft -> archived)", async () => {
    const provider = makeProvider();
    const id = await seedEntry(provider, "draft");
    const engine = newEngine(provider);

    const result = await run(engine, "remove", { id });

    expect(result.ok).toBe(true);
    const row = (await provider("KnowledgeBaseEntry").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("archived");
  });

  it("publishEntry on a non-draft entry is rejected and the enum-typed status is untouched", async () => {
    const provider = makeProvider();
    const id = await seedEntry(provider, "published");
    const engine = newEngine(provider);

    const result = await run(engine, "publishEntry", { id });

    // guard self.status == "draft" excludes published — enforcement held.
    expect(result.ok).toBe(false);
    const row = (await provider("KnowledgeBaseEntry").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("published");
  });
});
