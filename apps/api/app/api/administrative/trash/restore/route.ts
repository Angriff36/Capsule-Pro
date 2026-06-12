import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/app/lib/auth-roles";
import {
  getDeletedAtField,
  getPrismaDelegate,
  getTenantField,
} from "@/lib/trash/entity-helpers";

export const runtime = "nodejs";

interface RestoreRequestBody {
  cascade?: boolean;
  entities: Array<{
    id: string;
    type: string;
  }>;
}

interface RestoreResult {
  failed: Array<{ id: string; type: string; error: string }>;
  restored: Array<{ id: string; type: string; displayName: string }>;
  skipped: Array<{ id: string; type: string; reason: string }>;
  success: boolean;
}

function generateDisplayName(
  entityType: string,
  record: Record<string, unknown>
): string {
  const fieldMap: Partial<Record<string, string[]>> = {
    Event: ["title"],
    Client: ["name"],
    User: ["firstName", "lastName", "email"],
    Venue: ["name"],
    Recipe: ["name"],
    Menu: ["name"],
    Ingredient: ["name"],
    Proposal: ["title"],
    AdminTask: ["title"],
    WorkOrder: ["title"],
    KitchenTask: ["title"],
    PrepTask: ["name"],
    PrepList: ["name"],
    Equipment: ["name"],
    Station: ["name"],
    Container: ["name"],
    Note: ["title"],
    BattleBoard: ["name"],
    CommandBoard: ["name"],
    Location: ["name"],
    InventorySupplier: ["name"],
  };

  const fields = fieldMap[entityType];
  if (!(fields && record)) {
    return `${entityType} (${(record?.id as string | undefined)?.slice(0, 8) ?? "unknown"})`;
  }

  const parts = fields
    .map((f) => record[f])
    .filter((v) => v != null && v !== "");

  if (parts.length === 0) {
    return `${entityType} (${(record.id as string | undefined)?.slice(0, 8) ?? "unknown"})`;
  }

  return parts.join(" ");
}

/**
 * POST /api/administrative/trash/restore
 *
 * Restore soft-deleted entities
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiAdmin();
  if (!guard.ok) {
    return guard.response;
  }
  const { tenantId } = guard;

  try {
    const body: RestoreRequestBody = await request.json();
    const { entities, cascade = false } = body;

    if (!(entities && Array.isArray(entities)) || entities.length === 0) {
      return NextResponse.json(
        { message: "Invalid request: entities array required" },
        { status: 400 }
      );
    }

    if (entities.length > 100) {
      return NextResponse.json(
        { message: "Cannot restore more than 100 entities at once" },
        { status: 400 }
      );
    }

    const result: RestoreResult = {
      success: true,
      restored: [],
      failed: [],
      skipped: [],
    };

    // Process each entity
    for (const entity of entities) {
      if (!(entity.id && entity.type)) {
        result.failed.push({
          id: entity.id ?? "unknown",
          type: entity.type ?? "unknown",
          error: "Missing id or type",
        });
        continue;
      }

      try {
        const delegate = getPrismaDelegate(entity.type, database);
        if (!delegate) {
          result.failed.push({
            id: entity.id,
            type: entity.type,
            error: "Unknown entity type",
          });
          continue;
        }

        const tenantField = getTenantField(entity.type);
        const deletedAtField = getDeletedAtField(entity.type);

        // Check if entity exists and is soft-deleted
        const existing = (await delegate.findFirst({
          where: {
            id: entity.id,
            [tenantField]: tenantId,
            [deletedAtField]: { not: null },
          },
        })) as Record<string, unknown> | null;

        if (!existing) {
          // Check if it's already active (not deleted)
          const active = (await delegate.findFirst({
            where: {
              id: entity.id,
              [tenantField]: tenantId,
              [deletedAtField]: null,
            },
          })) as Record<string, unknown> | null;

          if (active) {
            result.skipped.push({
              id: entity.id,
              type: entity.type,
              reason: "Entity is already active (not deleted)",
            });
          } else {
            result.failed.push({
              id: entity.id,
              type: entity.type,
              error: "Entity not found",
            });
          }
          continue;
        }

        // Restore the entity by setting deletedAt to null
        await delegate.update({
          where: {
            id: entity.id,
            [tenantField]: tenantId,
          },
          data: {
            [deletedAtField]: null,
          },
          select: {
            id: true,
            [deletedAtField]: true,
          },
        });

        result.restored.push({
          id: entity.id,
          type: entity.type,
          displayName: generateDisplayName(entity.type, existing),
        });

        // If cascade is enabled, also restore dependent entities
        if (cascade) {
          await restoreDependentEntities(
            tenantId,
            entity.id,
            entity.type,
            result
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        result.failed.push({
          id: entity.id,
          type: entity.type,
          error: errorMessage,
        });
      }
    }

    // Determine overall success
    result.success = result.failed.length === 0;

    return NextResponse.json(result);
  } catch (error) {
    captureException(error);
    log.error("Error restoring entities:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Restore entities that depend on the given entity
 */
async function restoreDependentEntities(
  tenantId: string,
  entityId: string,
  entityType: string,
  result: RestoreResult
): Promise<void> {
  // Dependency mappings for cascade restore
  const dependencyMappings: Record<
    string,
    Array<{ dependentEntity: string; field: string }>
  > = {
    Event: [
      { dependentEntity: "EventStaff", field: "eventId" },
      { dependentEntity: "EventTimeline", field: "eventId" },
      { dependentEntity: "EventBudget", field: "eventId" },
      { dependentEntity: "EventProfitability", field: "eventId" },
      { dependentEntity: "EventSummary", field: "eventId" },
    ],
    Client: [
      { dependentEntity: "ClientContact", field: "clientId" },
      { dependentEntity: "ClientPreference", field: "clientId" },
    ],
    Recipe: [
      { dependentEntity: "RecipeVersion", field: "recipeId" },
      { dependentEntity: "RecipeIngredient", field: "recipeId" },
    ],
    Menu: [{ dependentEntity: "MenuDish", field: "menuId" }],
    PrepList: [{ dependentEntity: "PrepListItem", field: "prepListId" }],
  };

  const dependents = dependencyMappings[entityType] || [];

  for (const dep of dependents) {
    try {
      const delegate = getPrismaDelegate(dep.dependentEntity, database);
      if (!delegate) {
        continue;
      }

      const tenantField = getTenantField(dep.dependentEntity);
      const deletedAtField = getDeletedAtField(dep.dependentEntity);

      // Find soft-deleted dependents
      const records = (await delegate.findMany({
        where: {
          [tenantField]: tenantId,
          [dep.field]: entityId,
          [deletedAtField]: { not: null },
        },
        select: {
          id: true,
        },
        take: 50, // Limit cascade restore
      })) as Array<{ id: string }>;

      for (const record of records) {
        await delegate.update({
          where: { id: record.id },
          data: { [deletedAtField]: null },
        });

        result.restored.push({
          id: record.id,
          type: dep.dependentEntity,
          displayName: `${dep.dependentEntity} (${record.id.slice(0, 8)})`,
        });
      }
    } catch (err) {
      log.warn(`Failed to restore dependent ${dep.dependentEntity}:`, err);
    }
  }
}

/**
 * DELETE /api/administrative/trash/restore
 *
 * Permanently delete soft-deleted entities (cannot be undone)
 */
export async function DELETE(request: NextRequest) {
  const guard = await requireApiAdmin();
  if (!guard.ok) {
    return guard.response;
  }
  const { tenantId } = guard;
  const { searchParams } = new URL(request.url);

  const entityId = searchParams.get("entityId");
  const entityType = searchParams.get("entityType");

  if (!(entityId && entityType)) {
    return NextResponse.json(
      { message: "Missing entityId or entityType parameter" },
      { status: 400 }
    );
  }

  try {
    const delegate = getPrismaDelegate(entityType, database);
    if (!delegate) {
      return NextResponse.json(
        { message: "Unknown entity type" },
        { status: 400 }
      );
    }

    const tenantField = getTenantField(entityType);
    const deletedAtField = getDeletedAtField(entityType);

    // Verify the entity is soft-deleted before permanent delete
    const existing = await delegate.findFirst({
      where: {
        id: entityId,
        [tenantField]: tenantId,
        [deletedAtField]: { not: null },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Entity not found or not soft-deleted" },
        { status: 404 }
      );
    }

    // Permanently delete the record
    await delegate.delete({
      where: {
        id: entityId,
        [tenantField]: tenantId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Entity permanently deleted",
    });
  } catch (error) {
    captureException(error);
    log.error("Error permanently deleting entity:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
