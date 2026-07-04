/**
 * Test helpers for API route tests
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EntityInstance, Store } from "@angriff36/manifest";
import type { IR } from "@angriff36/manifest/ir";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { NextRequest } from "next/server";
import type { CurrentUser } from "@/app/lib/tenant";

/** Absolute path to `manifest/source`, resolved from the apps/api cwd. */
const MANIFEST_SOURCE_ROOT = join(process.cwd(), "../../manifest/source");

/**
 * Compile a single `.manifest` source file to IR for unit tests.
 *
 * WHY this exists: real domain sources open with `use "../_base.manifest"`,
 * which declares the shared tenant and the `TenantScoped` / `SoftDeletable`
 * mixin entities. The single-source `compileToIR` does NOT resolve `use`
 * directives, so under @angriff36/manifest 2.18.6 a bare per-file compile fails
 * with "mixes unknown entity 'TenantScoped'". The authoritative multi-file
 * `compileProjectToIR` resolves `use` but also runs cross-file relationship
 * validation, which rejects a single entry whose relationships target entities
 * in sibling files (PrepList, Station, Event, …).
 *
 * The minimal, correct compile unit for a unit test is therefore: the `_base`
 * module concatenated with the target source (the `use` line stripped, since
 * the base is now inlined). This resolves the mixins without pulling in — or
 * validating against — the rest of the project. Mixin source entities
 * (TenantScoped/SoftDeletable) appear in the resulting IR alongside the domain
 * entity; they carry no commands and are inert for runtime/projection tests.
 *
 * @param relPath path relative to `manifest/source`, e.g. `"kitchen/prep-task-rules.manifest"`.
 */
export async function compileManifestSourceForTest(
  relPath: string
): Promise<IR> {
  const base = readFileSync(
    join(MANIFEST_SOURCE_ROOT, "_base.manifest"),
    "utf-8"
  );
  const source = readFileSync(join(MANIFEST_SOURCE_ROOT, relPath), "utf-8");
  // Drop the `use "..."` line — the base it points to is inlined above it.
  const withoutUse = source.replace(/^\s*use\s+"[^"]+"\s*$/m, "");
  const combined = `${base}\n${withoutUse}`;

  const { ir, diagnostics } = await compileToIR(combined);
  if (!ir) {
    throw new Error(
      `Failed to compile ${relPath}: ${diagnostics
        .map((d: { message: string }) => d.message)
        .join(", ")}`
    );
  }
  return ir;
}

/**
 * Map-backed in-memory Manifest store that actually persists, so command
 * mutations and computed evaluations can be read back in runtime tests.
 *
 * WHY this exists: every entity in the IR is declared `store ... in durable`
 * (the 2026-06-03 all-durable flip). `durable` is backend-neutral, so the
 * RuntimeEngine REQUIRES a `storeProvider` — without one it throws at
 * construction ("declares durable but no storeProvider is bound"). Production
 * wires a Prisma-backed adapter; runtime-semantics tests only need this
 * persistent in-memory equivalent. Mirrors the upstream `MemoryStore`
 * (getAll/getById/create/update/delete/clear).
 */
export class InMemoryStore implements Store {
  private readonly items = new Map<string, EntityInstance>();

  async getAll(): Promise<EntityInstance[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    return this.items.get(id);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const item = { ...data, id } as EntityInstance;
    this.items.set(id, item);
    return item;
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    const existing = this.items.get(id);
    if (!existing) {
      return;
    }
    const updated = { ...existing, ...data, id } as EntityInstance;
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}

/**
 * Build a `storeProvider` for a ManifestRuntimeEngine: one persistent
 * InMemoryStore per entity for the lifetime of the runtime. Pass as the THIRD
 * constructor argument (RuntimeOptions), e.g.
 * `new ManifestRuntimeEngine(ir, { user }, { storeProvider: inMemoryStoreProvider() })`.
 */
export function inMemoryStoreProvider(): (entityName: string) => Store {
  const stores = new Map<string, InMemoryStore>();
  return (entityName: string) => {
    let store = stores.get(entityName);
    if (!store) {
      store = new InMemoryStore();
      stores.set(entityName, store);
    }
    return store;
  };
}

/**
 * Read a manifest source file and inline the shared `_base.manifest` module.
 *
 * Domain manifests under `manifest/source/<domain>/` begin with
 * `use "../_base.manifest"` to pull in the shared `tenant` declaration, role
 * hierarchy, and the `TenantScoped` / `SoftDeletable` mixin source entities.
 * The exported single-source `compileToIR(source)` (used by manifest unit
 * tests) has no filesystem host, so it can't resolve that `use` directive —
 * under compiler 2.18.6 the mixins are unknown and compilation fails
 * ("mixes unknown entity 'TenantScoped'").
 *
 * This reads the real `_base.manifest`, strips the `use` line from the domain
 * source, and prepends the base — reproducing exactly what project-level
 * compilation provides, without editing any `manifest/source/*` file.
 *
 * @param relPath path relative to `manifest/source/`, e.g.
 *   `"kitchen/prep-task-rules.manifest"`.
 */
export function readManifestSourceWithBase(relPath: string): string {
  const sourceRoot = join(process.cwd(), "../../manifest/source");
  const base = readFileSync(join(sourceRoot, "_base.manifest"), "utf-8");
  const raw = readFileSync(join(sourceRoot, relPath), "utf-8");
  // Strip the `use "..._base.manifest"` directive — the mixins/roles/tenant it
  // would resolve are inlined via `base` below.
  const withoutUse = raw.replace(
    /^[ \t]*use[ \t]+"[^"]*_base\.manifest"[ \t]*\r?\n/m,
    ""
  );
  return `${base}\n${withoutUse}`;
}

/**
 * Default test user with all required CurrentUser properties
 */
export const TEST_USER: CurrentUser = {
  id: "test-user-id",
  tenantId: "test-tenant-id",
  role: "admin",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
};

/**
 * Create a test user with custom properties
 */
export function createTestUser(
  overrides: Partial<CurrentUser> = {}
): CurrentUser {
  return { ...TEST_USER, ...overrides };
}

/**
 * Create a mock NextRequest from a URL
 */
export function createMockRequest(
  url: string,
  options: ConstructorParameters<typeof NextRequest>[1] = {}
): NextRequest {
  return new NextRequest(new URL(url), options);
}
