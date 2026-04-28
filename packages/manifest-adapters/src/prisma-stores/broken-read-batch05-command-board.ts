/**
 * Prisma stores for BROKEN_PRISMA_READ batch 05 — CommandBoard auxiliary trio.
 *
 * Covers CommandBoardConnection, CommandBoardGroup, and CommandBoardLayout
 * (all in `tenant_events.*`). Each entity carries a soft-delete `deletedAt`
 * column, so `getAll`/`getById` filter `deletedAt: null` and `delete` writes
 * `deletedAt = new Date()` rather than removing the row.
 *
 * Schema ↔ manifest mismatches handled here:
 *
 * - The manifest declares timestamp fields (`createdAt`, `updatedAt`,
 *   `deletedAt`, etc.) as `number` (epoch millis) but Prisma stores them as
 *   `DateTime`. Writes coerce via `asNullableDate`; reads pass the Prisma
 *   `Date | null` through verbatim — the runtime / read-API layer is
 *   responsible for the final epoch projection.
 * - `CommandBoardLayout.viewport` is `Json` in Prisma but the manifest
 *   declares `viewport: string = "{}"`. We pass values through
 *   `asJsonInput` so JSON objects round-trip cleanly while string defaults
 *   like `"{}"` are stored as JSON strings (still valid JSON).
 * - `CommandBoardLayout.visibleCards` is `String[]` in Prisma but the
 *   manifest declares `visibleCards: string = ""`. We accept either an
 *   array or a comma-joined string (mirroring the `CommandBoard.tags`
 *   pattern from batch 04).
 * - `CommandBoardGroup.color` is `String?` (nullable) in Prisma; the
 *   manifest declares it as `string = ""`. We coerce to `null` via
 *   `asNullableString` when blank.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asJsonInput,
  asNullableNumber,
  asNullableString,
  asString,
  asStringArray,
  type EntityInstance,
  reportOp,
} from "./shared.js";

/** Coerce manifest visible-card input (string | string[]) to string[]. */
function coerceVisibleCards(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => v !== null && v !== undefined).map(String);
  }
  if (typeof value === "string" && value.length > 0) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return asStringArray(value);
}

// ---------------------------------------------------------------------------
// CommandBoardConnection (tenant_events.command_board_connections)
// ---------------------------------------------------------------------------

export class CommandBoardConnectionPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.commandBoardConnection.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.commandBoardConnection.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.commandBoardConnection.create({
      data: {
        tenantId: this.tenantId,
        id,
        boardId: asString(data.boardId),
        fromCardId: asString(data.fromCardId),
        toCardId: asString(data.toCardId),
        relationshipType: asString(data.relationshipType) || "generic",
        label: asNullableString(data.label),
        visible: asBool(data.visible, true),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.boardId !== undefined) patch.boardId = asString(data.boardId);
      if (data.fromCardId !== undefined)
        patch.fromCardId = asString(data.fromCardId);
      if (data.toCardId !== undefined)
        patch.toCardId = asString(data.toCardId);
      if (data.relationshipType !== undefined)
        patch.relationshipType =
          asString(data.relationshipType) || "generic";
      if (data.label !== undefined)
        patch.label = asNullableString(data.label);
      if (data.visible !== undefined)
        patch.visible = asBool(data.visible, true);
      const row = await this.prisma.commandBoardConnection.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.commandBoardConnection.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.commandBoardConnection.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      boardId: (r.boardId as string) ?? "",
      fromCardId: (r.fromCardId as string) ?? "",
      toCardId: (r.toCardId as string) ?? "",
      relationshipType: (r.relationshipType as string) ?? "generic",
      label: (r.label as string) ?? "",
      visible: r.visible ?? true,
    };
  }
}

// ---------------------------------------------------------------------------
// CommandBoardGroup (tenant_events.command_board_groups)
// ---------------------------------------------------------------------------

export class CommandBoardGroupPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.commandBoardGroup.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.commandBoardGroup.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.commandBoardGroup.create({
      data: {
        tenantId: this.tenantId,
        id,
        boardId: asString(data.boardId),
        name: asString(data.name),
        color: asNullableString(data.color),
        collapsed: asBool(data.collapsed, false),
        positionX: asNullableNumber(data.positionX) ?? 0,
        positionY: asNullableNumber(data.positionY) ?? 0,
        width: asNullableNumber(data.width) ?? 300,
        height: asNullableNumber(data.height) ?? 200,
        zIndex: asNullableNumber(data.zIndex) ?? 0,
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.boardId !== undefined) patch.boardId = asString(data.boardId);
      if (data.name !== undefined) patch.name = asString(data.name);
      if (data.color !== undefined)
        patch.color = asNullableString(data.color);
      if (data.collapsed !== undefined)
        patch.collapsed = asBool(data.collapsed, false);
      if (data.positionX !== undefined)
        patch.positionX = asNullableNumber(data.positionX) ?? 0;
      if (data.positionY !== undefined)
        patch.positionY = asNullableNumber(data.positionY) ?? 0;
      if (data.width !== undefined)
        patch.width = asNullableNumber(data.width) ?? 300;
      if (data.height !== undefined)
        patch.height = asNullableNumber(data.height) ?? 200;
      if (data.zIndex !== undefined)
        patch.zIndex = asNullableNumber(data.zIndex) ?? 0;
      const row = await this.prisma.commandBoardGroup.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.commandBoardGroup.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.commandBoardGroup.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      boardId: (r.boardId as string) ?? "",
      name: (r.name as string) ?? "",
      color: (r.color as string) ?? "",
      collapsed: r.collapsed ?? false,
      positionX: r.positionX ?? 0,
      positionY: r.positionY ?? 0,
      width: r.width ?? 300,
      height: r.height ?? 200,
      zIndex: r.zIndex ?? 0,
    };
  }
}

// ---------------------------------------------------------------------------
// CommandBoardLayout (tenant_events.command_board_layouts)
// ---------------------------------------------------------------------------

export class CommandBoardLayoutPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.commandBoardLayout.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.commandBoardLayout.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.commandBoardLayout.create({
      data: {
        tenantId: this.tenantId,
        id,
        boardId: asString(data.boardId),
        userId: asString(data.userId),
        name: asString(data.name),
        viewport: asJsonInput(data.viewport),
        visibleCards: coerceVisibleCards(data.visibleCards),
        gridSize: asNullableNumber(data.gridSize) ?? 40,
        showGrid: asBool(data.showGrid, true),
        snapToGrid: asBool(data.snapToGrid, true),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.boardId !== undefined) patch.boardId = asString(data.boardId);
      if (data.userId !== undefined) patch.userId = asString(data.userId);
      if (data.name !== undefined) patch.name = asString(data.name);
      if (data.viewport !== undefined)
        patch.viewport = asJsonInput(data.viewport);
      if (data.visibleCards !== undefined)
        patch.visibleCards = coerceVisibleCards(data.visibleCards);
      if (data.gridSize !== undefined)
        patch.gridSize = asNullableNumber(data.gridSize) ?? 40;
      if (data.showGrid !== undefined)
        patch.showGrid = asBool(data.showGrid, true);
      if (data.snapToGrid !== undefined)
        patch.snapToGrid = asBool(data.snapToGrid, true);
      const row = await this.prisma.commandBoardLayout.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.commandBoardLayout.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.commandBoardLayout.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      boardId: (r.boardId as string) ?? "",
      userId: (r.userId as string) ?? "",
      name: (r.name as string) ?? "",
      viewport: r.viewport ?? {},
      visibleCards: Array.isArray(r.visibleCards)
        ? (r.visibleCards as string[])
        : [],
      gridSize: r.gridSize ?? 40,
      showGrid: r.showGrid ?? true,
      snapToGrid: r.snapToGrid ?? true,
    };
  }
}

