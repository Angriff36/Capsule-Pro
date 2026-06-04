/**
 * Test helpers for API route tests
 */

import type { EntityInstance, Store } from "@angriff36/manifest";
import { NextRequest } from "next/server";
import type { CurrentUser } from "@/app/lib/tenant";

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
      return undefined;
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
