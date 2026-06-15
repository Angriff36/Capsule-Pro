/**
 * In-memory store provider for IR introspection (explain_entity / explain_command).
 *
 * Upstream manifest-mcp's session store constructs a RuntimeEngine for every
 * cached IR. Durable entities require a storeProvider even when tools only read
 * IR metadata and never persist data.
 */

import type { Store } from "@angriff36/manifest";

class IntrospectionStore implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();

  getAll(): Promise<unknown[]> {
    return Promise.resolve(Array.from(this.items.values()));
  }

  getById(id: string): Promise<unknown> {
    return Promise.resolve(this.items.get(id));
  }

  create(data: Record<string, unknown>): Promise<unknown> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return Promise.resolve(row);
  }

  update(id: string, data: Record<string, unknown>): Promise<unknown> {
    const existing = this.items.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return Promise.resolve(row);
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.items.delete(id));
  }

  clear(): Promise<void> {
    this.items.clear();
    return Promise.resolve();
  }
}

/** Returns a per-entity in-memory store — sufficient for explain tooling. */
export function createIntrospectionStoreProvider(): (
  entityName: string
) => Store {
  const stores = new Map<string, IntrospectionStore>();
  return (entityName: string): Store => {
    let store = stores.get(entityName);
    if (!store) {
      store = new IntrospectionStore();
      stores.set(entityName, store);
    }
    return store;
  };
}
