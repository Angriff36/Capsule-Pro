import type { Store } from "@angriff36/manifest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IrBundle = any;

const PERSIST_NULL_FORBIDDEN = new Set(["createdAt", "updatedAt"]);

export function assertPersistableInstance(
  ir: IrBundle,
  entityName: string,
  data: Record<string, unknown>
): void {
  const entity = (ir.entities ?? []).find(
    (entry: { name: string }) => entry.name === entityName
  );
  if (!entity) {
    return;
  }

  for (const prop of entity.properties ?? []) {
    if (!PERSIST_NULL_FORBIDDEN.has(prop.name)) {
      continue;
    }
    if (data[prop.name] === null) {
      throw new Error(
        `Invalid persist payload for ${entityName}: property "${prop.name}" must not be null (mirrors Prisma @default(now()) bypass when GenericPrismaStore sends explicit null)`
      );
    }
  }
}

class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();

  // biome-ignore lint/suspicious/noExplicitAny: test store
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }

  // biome-ignore lint/suspicious/noExplicitAny: test store
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }

  // biome-ignore lint/suspicious/noExplicitAny: test store
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }

  // biome-ignore lint/suspicious/noExplicitAny: test store
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

export function createValidatingStoreProvider(
  ir: IrBundle
): (entity: string) => Store {
  const stores = new Map<string, Mem>();

  return (entity: string) => {
    let store = stores.get(entity);
    if (!store) {
      const inner = new Mem();
      store = inner;
      stores.set(entity, inner);
    }

    const innerStore = store;
    return {
      getAll: () => innerStore.getAll(),
      getById: (id: string) => innerStore.getById(id),
      create: async (data: Record<string, unknown>) => {
        assertPersistableInstance(ir, entity, { ...data });
        return innerStore.create(data);
      },
      update: async (id: string, data: Record<string, unknown>) => {
        assertPersistableInstance(ir, entity, { ...data });
        return innerStore.update(id, data);
      },
      delete: (id: string) => innerStore.delete(id),
      clear: () => innerStore.clear(),
    };
  };
}

export async function seedSmokeFixtures(
  provider: (entity: string) => Store,
  fixtureIds: Readonly<Record<string, string>>
): Promise<void> {
  const tenantId = fixtureIds.tenantId;
  const seeds: Array<{ entity: string; row: Record<string, unknown> }> = [
    {
      entity: "Event",
      row: {
        id: fixtureIds.eventId,
        tenantId,
        title: "Smoke Fixture Event",
        clientId: fixtureIds.clientId,
        status: "draft",
        eventType: "general",
        deletedAt: null,
      },
    },
    {
      entity: "Client",
      row: {
        id: fixtureIds.clientId,
        tenantId,
        name: "Smoke Fixture Client",
        status: "active",
        deletedAt: null,
      },
    },
    {
      entity: "StaffMember",
      row: {
        id: fixtureIds.staffMemberId,
        tenantId,
        displayName: "Smoke Staff",
        status: "active",
        deletedAt: null,
      },
    },
    {
      entity: "User",
      row: {
        id: fixtureIds.userId,
        tenantId,
        email: "smoke@example.com",
        role: "admin",
        deletedAt: null,
      },
    },
    {
      entity: "Venue",
      row: {
        id: fixtureIds.venueId,
        tenantId,
        name: "Smoke Venue",
        deletedAt: null,
      },
    },
  ];

  for (const { entity, row } of seeds) {
    try {
      await provider(entity).create(row as never);
    } catch {
      // Best-effort — entity may not exist in IR store map for this provider.
    }
  }
}
