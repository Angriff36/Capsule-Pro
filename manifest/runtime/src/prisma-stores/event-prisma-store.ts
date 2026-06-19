/**
 * Event Prisma store — advisory-lock eventNumber allocation on governed create.
 * Delegates reads/updates to package GenericPrismaStore; only create() is bespoke.
 */
import type { EntityInstance, Store } from "@angriff36/manifest";
import { GenericPrismaStore } from "@angriff36/manifest/stores/prisma-generic";
import type { PrismaClient } from "@repo/database/standalone";
import { PRISMA_MODEL_METADATA } from "../generated/prisma-model-metadata.generated";
import {
  allocateEventNumberInTransaction,
  resolveEventNumberForCreate,
} from "./allocate-event-number";

export class EventPrismaStore implements Store<EntityInstance> {
  private readonly inner: GenericPrismaStore;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {
    // The package GenericPrismaStore.update builds a BROKEN optimistic-lock
    // WHERE for compound-key entities: it inserts the version field INTO the
    // `tenantId_id` selector (which Prisma rejects: "Unknown argument version")
    // and then swallows the error (`catch { return undefined }`), silently
    // dropping the write — the engine still emits the event and returns 200, so
    // edits appear to save but never persist. Event is `@@id([tenantId,id])`
    // (compound) + has a `version` column, so every update hit this path.
    // Until the package fixes compound-key OCC, clear `versionProperty` for the
    // inner store so updates use a plain, persisting write. `version` still
    // increments because the runtime supplies it in the update `data`.
    const eventMeta = PRISMA_MODEL_METADATA.Event;
    const metadataWithoutBrokenOcc = {
      ...PRISMA_MODEL_METADATA,
      Event: { ...eventMeta, versionProperty: undefined },
    };
    this.inner = new GenericPrismaStore(
      prisma,
      "Event",
      tenantId,
      metadataWithoutBrokenOcc
    );
  }

  getAll(): Promise<EntityInstance[]> {
    return this.inner.getAll();
  }

  getById(id: string): Promise<EntityInstance | undefined> {
    return this.inner.getById(id);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    return this.prisma.$transaction(async (tx) => {
      const allocated = await allocateEventNumberInTransaction(
        tx,
        this.tenantId
      );
      const enriched = resolveEventNumberForCreate(
        data as Record<string, unknown>,
        allocated
      );
      const scoped = new GenericPrismaStore(
        tx,
        "Event",
        this.tenantId,
        PRISMA_MODEL_METADATA
      );
      return scoped.create(enriched as Partial<EntityInstance>);
    });
  }

  update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    return this.inner.update(id, data);
  }

  delete(id: string): Promise<boolean> {
    return this.inner.delete(id);
  }

  clear(): Promise<void> {
    return this.inner.clear();
  }
}
