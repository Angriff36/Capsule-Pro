/**
 * GenericPrismaStore — a single metadata-driven Prisma store that persists ANY
 * durable Manifest entity to its real typed Prisma table, without a hand-written
 * store class or `createPrismaStoreProvider` switch case per entity.
 *
 * It replaces the per-entity bespoke-store requirement for the common case:
 * an entity whose live Prisma model has a single `id` PK or a composite
 * `@@id([tenantId, id])` / `@@unique([tenantId, id])`, standard scalar columns,
 * and (optionally) a `deletedAt` soft-delete column.
 *
 * Model metadata comes from `../generated/prisma-model-metadata.generated.ts`
 * (produced by `manifest/scripts/generate-prisma-model-metadata.mjs` because
 * Prisma 7.x has no runtime `Prisma.dmmf`). Field mapping rules:
 *  - Manifest entity props are camelCase; Prisma field names may be snake_case
 *    (e.g. Notification.recipient_employee_id). We look up the value by the
 *    field's camelCase `irName` first, then its literal Prisma `name`.
 *  - `tenantId` is always injected from the store, never trusted from input.
 *  - `id` uses the supplied id or a fresh uuid.
 *  - `@updatedAt` fields are skipped on create/update (Prisma manages them).
 *  - Required columns without a DB default that are not supplied are left out so
 *    Prisma surfaces a clear NOT-NULL error (fail loud) — except required
 *    DateTime columns, which get `new Date()` (the createdAt convention).
 *  - Values are coerced by Prisma scalar type using the shared.ts helpers.
 *  - Reads are mapped back to camelCase `irName` keys so the runtime sees
 *    Manifest property names regardless of the physical column name.
 *
 * Audit/outbox is NOT this store's concern: it is wrapped by `PrismaStore`
 * (the façade in prisma-store.ts), which threads the outbox writer + event
 * collector exactly as it does for bespoke stores.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asJsonInput,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asString,
  asStringArray,
  type EntityInstance,
  reportOp,
  toDecimalInput,
} from "./shared";
import { resolvePrismaModelKey } from "../generated/entity-to-prisma-model.generated";
import {
  PRISMA_MODEL_METADATA,
  type PrismaFieldMeta,
  type PrismaModelMeta,
} from "../generated/prisma-model-metadata.generated";
import {
  allocateEventNumberInTransaction,
  resolveEventNumberForCreate,
} from "./allocate-event-number";

// Minimal structural view of a Prisma delegate — the generic store stays
// untyped against the concrete model so one class serves every entity.
interface PrismaDelegate {
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  findFirst(args: unknown): Promise<Record<string, unknown> | null>;
  create(args: unknown): Promise<Record<string, unknown>>;
  update(args: unknown): Promise<Record<string, unknown>>;
  deleteMany(args: unknown): Promise<unknown>;
}

export class GenericPrismaStore implements Store<EntityInstance> {
  private readonly meta: PrismaModelMeta;
  private readonly delegate: PrismaDelegate;
  private readonly prisma: PrismaClient;
  private readonly entityName: string;

  constructor(
    prisma: PrismaClient,
    entityName: string,
    private readonly tenantId: string,
  ) {
    this.prisma = prisma;
    this.entityName = entityName;
    const modelKey = resolvePrismaModelKey(entityName);
    const meta =
      PRISMA_MODEL_METADATA[entityName] ?? PRISMA_MODEL_METADATA[modelKey];
    if (!meta) {
      throw new Error(
        `GenericPrismaStore: no Prisma metadata for entity "${entityName}"` +
          (modelKey !== entityName ? ` (resolved model key: "${modelKey}")` : "") +
          `. Run \`pnpm manifest:generate-metadata\` after confirming the model exists in schema.prisma.`,
      );
    }
    // Dynamic delegate lookup: PrismaClient models are accessed by name
    // (e.g. prisma.user, prisma.wasteEntry). Since the entity name is a runtime
    // string from metadata, we index dynamically — this requires escaping the
    // typed PrismaClient to a generic record via `as unknown as Record`.
    const delegate = (prisma as unknown as Record<string, unknown>)[
      meta.accessor
    ] as PrismaDelegate | undefined;
    if (!delegate || typeof delegate.findMany !== "function") {
      throw new Error(
        `GenericPrismaStore: Prisma client has no delegate "${meta.accessor}" for entity "${entityName}".`,
      );
    }
    this.meta = meta;
    this.delegate = delegate;
  }

  /** Physical tenant column (camelCase tenantId or legacy tenant_id). */
  private tenantField(): PrismaFieldMeta | undefined {
    return this.meta.fields.find(
      (f) =>
        f.irName === "tenantId" ||
        f.name === "tenantId" ||
        f.name === "tenant_id",
    );
  }

  private coerce(field: PrismaFieldMeta, value: unknown): unknown {
    if (field.isList) return asStringArray(value);
    switch (field.type) {
      case "Decimal":
        return toDecimalInput(value);
      case "Int":
      case "BigInt":
      case "Float":
        return asNullableNumber(value);
      case "Boolean":
        return asBool(value);
      case "DateTime":
        return asNullableDate(value);
      case "Json":
        return asJsonInput(value);
      default:
        // String + enums + Bytes → string form
        return field.optional ? asNullableString(value) : asString(value);
    }
  }

  private buildCreateData(data: Partial<EntityInstance>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const now = new Date();
    for (const field of this.meta.fields) {
      if (field.isUpdatedAt) continue; // Prisma manages @updatedAt
      if (field.irName === "tenantId" || field.name === "tenantId" || field.name === "tenant_id") {
        if (this.meta.requiresTenantConnect) {
          out.tenant = { connect: { id: this.tenantId } };
        } else {
          out[field.name] = this.tenantId; // never trust input tenantId
        }
        continue;
      }
      if (field.name === "id") {
        out.id = (data.id as string | undefined) ?? crypto.randomUUID();
        continue;
      }
      const raw =
        data[field.irName] !== undefined ? data[field.irName] : data[field.name];
      if (raw === undefined) {
        // not supplied → let the DB default apply; inject now() only for a
        // required DateTime column with no default (the createdAt convention).
        if (!field.hasDefault && !field.optional && field.type === "DateTime") {
          out[field.name] = now;
        }
        continue;
      }
      out[field.name] = this.coerce(field, raw);
    }
    return out;
  }

  private buildPatch(data: Partial<EntityInstance>): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    for (const field of this.meta.fields) {
      if (field.isUpdatedAt) continue; // auto
      if (field.name === "tenantId" || field.name === "id") continue;
      const hasIr = data[field.irName] !== undefined;
      const hasRaw = data[field.name] !== undefined;
      if (!hasIr && !hasRaw) continue;
      patch[field.name] = this.coerce(
        field,
        hasIr ? data[field.irName] : data[field.name],
      );
    }
    return patch;
  }

  private whereUnique(id: string): Record<string, unknown> {
    if (this.meta.pkFields.length > 1) {
      const key: Record<string, unknown> = {};
      for (const pf of this.meta.pkFields) {
        key[pf] =
          pf === "tenantId" || pf === "tenant_id" ? this.tenantId : id;
      }
      return { [this.meta.whereAccessor]: key };
    }
    return { [this.meta.pkFields[0]]: id };
  }

  private tenantFilter(extra?: Record<string, unknown>): Record<string, unknown> {
    const tenantCol = this.tenantField()?.name ?? "tenantId";
    const where: Record<string, unknown> = { [tenantCol]: this.tenantId, ...extra };
    if (this.meta.hasDeletedAt) {
      const deletedField = this.meta.fields.find(
        (f) => f.irName === "deletedAt" || f.name === "deletedAt" || f.name === "deleted_at",
      );
      where[deletedField?.name ?? "deletedAt"] = null;
    }
    return where;
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    const entity: EntityInstance = { id: row.id as string };
    for (const field of this.meta.fields) {
      entity[field.irName] = row[field.name] ?? null;
    }
    return entity;
  }

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.delegate.findMany({
      where: this.tenantFilter(),
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.delegate.findFirst({ where: this.tenantFilter({ id }) });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    if (this.entityName === "Event") {
      const row = await this.createEventRow(data);
      return this.mapToManifestEntity(row);
    }

    const row = await this.delegate.create({ data: this.buildCreateData(data) });
    return this.mapToManifestEntity(row);
  }

  /**
   * Event.create may omit eventNumber — allocate EVT-YYYY-#### under an advisory
   * lock in the same transaction as the insert (not in app-layer Prisma).
   */
  private async createEventRow(
    data: Partial<EntityInstance>
  ): Promise<Record<string, unknown>> {
    return this.prisma.$transaction(async (tx) => {
      const payload = data as Record<string, unknown>;
      const allocated = await allocateEventNumberInTransaction(tx, this.tenantId);
      const enriched = resolveEventNumberForCreate(payload, allocated);
      const row = await tx.event.create({
        data: this.buildCreateData(
          enriched as Partial<EntityInstance>
        ) as Parameters<typeof tx.event.create>[0]["data"],
      });
      return row as Record<string, unknown>;
    });
  }

  async update(
    id: string,
    data: Partial<EntityInstance>,
  ): Promise<EntityInstance | undefined> {
    try {
      const where = this.whereUnique(id);

      // DB-level optimistic concurrency: when the entity declares a versionProperty
      // and the incoming data includes a new version value, add a WHERE clause
      // requiring the current row to have the OLD version (newVersion - 1).
      // This prevents lost updates when two concurrent requests read the same row.
      if (this.meta.versionProperty) {
        const versionField = this.meta.fields.find(
          (f) => f.irName === this.meta.versionProperty || f.name === this.meta.versionProperty,
        );
        const newVersion = versionField
          ? (data[versionField.irName] ?? data[versionField.name]) as number | undefined
          : undefined;
        if (versionField && newVersion !== undefined) {
          const fieldName = versionField.name;
          const expectedVersion = newVersion - 1;
          // For composite keys, where is { whereAccessor: { tenantId, id } };
          // merge version alongside the unique compound.
          // For single PK, where is { id: "..." }; merge version at top level.
          if (this.meta.pkFields.length > 1) {
            const compound = where[this.meta.whereAccessor] as Record<string, unknown>;
            compound[fieldName] = expectedVersion;
          } else {
            where[fieldName] = expectedVersion;
          }
        }
      }

      const row = await this.delegate.update({
        where,
        data: this.buildPatch(data),
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      if (this.meta.hasDeletedAt) {
        await this.delegate.update({
          where: this.whereUnique(id),
          data: { deletedAt: new Date() },
        });
      } else {
        await this.delegate.deleteMany({ where: this.tenantFilter({ id }) });
      }
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.delegate.deleteMany({ where: { tenantId: this.tenantId } });
  }
}
