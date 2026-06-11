/**
 * Event Prisma store — advisory-lock eventNumber allocation on governed create.
 * Delegates reads/updates to package GenericPrismaStore; only create() is bespoke.
 */
import type { EntityInstance, Store } from "@angriff36/manifest";
import { GenericPrismaStore } from "@angriff36/manifest/stores/prisma-generic";
import type { PrismaClient } from "@repo/database/standalone";
import { PRISMA_MODEL_METADATA } from "../generated/manifest-prisma-store-metadata.generated";
import {
  allocateEventNumberInTransaction,
  resolveEventNumberForCreate,
} from "./allocate-event-number";

export class EventPrismaStore implements Store<EntityInstance> {
  private readonly inner: GenericPrismaStore;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {
    this.inner = new GenericPrismaStore(
      prisma,
      "Event",
      tenantId,
      PRISMA_MODEL_METADATA,
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
      const allocated = await allocateEventNumberInTransaction(tx, this.tenantId);
      const enriched = resolveEventNumberForCreate(
        data as Record<string, unknown>,
        allocated,
      );
      const scoped = new GenericPrismaStore(
        tx,
        "Event",
        this.tenantId,
        PRISMA_MODEL_METADATA,
      );
      return scoped.create(enriched as Partial<EntityInstance>);
    });
  }

  update(
    id: string,
    data: Partial<EntityInstance>,
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
