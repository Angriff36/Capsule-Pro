import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "../../../../../lib/tenant";

export const runtime = "nodejs";

interface RestoreRequestBody {
  entities: Array<{
    id: string;
    type: string;
  }>;
  cascade?: boolean;
}

interface RestoreResult {
  success: boolean;
  restored: Array<{ id: string; type: string; displayName: string }>;
  failed: Array<{ id: string; type: string; error: string }>;
  skipped: Array<{ id: string; type: string; reason: string }>;
}

// Entity type to Prisma model mapping
function getPrismaModelForEntity(entityType: string, db: typeof database): any {
  const modelMap: Record<string, string> = {
    Event: "event",
    Client: "client",
    Recipe: "recipe",
    Ingredient: "ingredient",
    Menu: "menu",
    Dish: "dish",
    Location: "location",
    Venue: "venue",
    User: "user",
    InventorySupplier: "inventorySupplier",
    PrepList: "prepList",
    Station: "station",
    Equipment: "equipment",
    WorkOrder: "workOrder",
    Proposal: "proposal",
    AdminTask: "adminTask",
    KitchenTask: "kitchenTask",
    PrepTask: "prepTask",
    Container: "container",
    PrepMethod: "prepMethod",
    Note: "note",
    BattleBoard: "battleBoard",
    CommandBoard: "commandBoard",
    CommandBoardCard: "commandBoardCard",
    CommandBoardLayout: "commandBoardLayout",
    CommandBoardGroup: "commandBoardGroup",
    CommandBoardConnection: "commandBoardConnection",
    EventProfitability: "eventProfitability",
    EventSummary: "eventSummary",
    EventReport: "eventReport",
    EventBudget: "eventBudget",
    BudgetLineItem: "budgetLineItem",
    ClientContact: "clientContact",
    ClientPreference: "clientPreference",
    UserPreference: "userPreference",
    Lead: "lead",
    ClientInteraction: "clientInteraction",
    ProposalLineItem: "proposalLineItem",
    ProposalTemplate: "proposalTemplate",
    RecipeVersion: "recipeVersion",
    RecipeIngredient: "recipeIngredient",
    MenuDish: "menuDish",
    PrepComment: "prepComment",
    EventStaffAssignment: "eventStaffAssignment",
    EventTimeline: "eventTimeline",
    EventImport: "eventImport",
    BoardProjection: "boardProjection",
    BoardAnnotation: "boardAnnotation",
    TimelineTask: "timelineTask",
    CateringOrder: "cateringOrder",
    InventoryItem: "inventoryItem",
    InventoryTransaction: "inventoryTransaction",
    InventoryAlert: "inventoryAlert",
    InventoryStock: "inventoryStock",
    InventoryForecast: "inventoryForecast",
    ForecastInput: "forecastInput",
    ReorderSuggestion: "reorderSuggestion",
    AlertsConfig: "alertsConfig",
    CycleCountSession: "cycleCountSession",
    CycleCountRecord: "cycleCountRecord",
    VarianceReport: "varianceReport",
    CycleCountAuditLog: "cycleCountAuditLog",
    PurchaseOrder: "purchaseOrder",
    PurchaseOrderItem: "purchaseOrderItem",
    Shipment: "shipment",
    ShipmentItem: "shipmentItem",
    InterLocationTransfer: "interLocationTransfer",
    InterLocationTransferItem: "interLocationTransferItem",
    LocationResourceShare: "locationResourceShare",
    Report: "report",
    AdminChatThread: "adminChatThread",
    AdminChatParticipant: "adminChatParticipant",
    AdminChatMessage: "adminChatMessage",
    RolePolicy: "rolePolicy",
    Workflow: "workflow",
    Notification: "notification",
    ActivityFeed: "activityFeed",
    Schedule: "schedule",
    ScheduleShift: "scheduleShift",
    TimeEntry: "timeEntry",
    TimecardEditRequest: "timecardEditRequest",
    EmployeeLocation: "employeeLocation",
    LaborBudget: "laborBudget",
    BudgetAlert: "budgetAlert",
    AllergenWarning: "allergenWarning",
    SensorReading: "sensorReading",
    IotAlertRule: "iotAlertRule",
    IotAlert: "iotAlert",
    FoodSafetyLog: "foodSafetyLog",
    Account: "account",
  };

  const modelName = modelMap[entityType];
  return (db as any)[modelName];
}

function generateDisplayName(entityType: string, record: any): string {
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
    return `${entityType} (${record?.id?.slice(0, 8) ?? "unknown"})`;
  }

  const parts = fields
    .map((f) => record[f])
    .filter((v) => v != null && v !== "");

  if (parts.length === 0) {
    return `${entityType} (${record.id?.slice(0, 8) ?? "unknown"})`;
  }

  return parts.join(" ");
}

/**
 * POST /api/administrative/trash/restore
 *
 * Restore soft-deleted entities
 */
export async function POST(request: NextRequest) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

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
        const PrismaModel = getPrismaModelForEntity(entity.type, database);
        if (!PrismaModel) {
          result.failed.push({
            id: entity.id,
            type: entity.type,
            error: "Unknown entity type",
          });
          continue;
        }

        // Check if entity exists and is soft-deleted
        const existing = await (PrismaModel as any).findFirst({
          where: {
            id: entity.id,
            tenantId,
            deletedAt: { not: null },
          },
        });

        if (!existing) {
          // Check if it's already active (not deleted)
          const active = await (PrismaModel as any).findFirst({
            where: {
              id: entity.id,
              tenantId,
              deletedAt: null,
            },
          });

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
        const restored = await (PrismaModel as any).update({
          where: {
            id: entity.id,
            tenantId,
          },
          data: {
            deletedAt: null,
          },
          select: {
            id: true,
            deletedAt: true,
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
    console.error("Error restoring entities:", error);
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
      { dependentEntity: "EventStaffAssignment", field: "eventId" },
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
      const PrismaModel = getPrismaModelForEntity(
        dep.dependentEntity,
        database
      );
      if (!PrismaModel) continue;

      // Find soft-deleted dependents
      const records = await (PrismaModel as any).findMany({
        where: {
          tenantId,
          [dep.field]: entityId,
          deletedAt: { not: null },
        },
        select: {
          id: true,
        },
        take: 50, // Limit cascade restore
      });

      for (const record of records) {
        await (PrismaModel as any).update({
          where: { id: record.id },
          data: { deletedAt: null },
        });

        result.restored.push({
          id: record.id,
          type: dep.dependentEntity,
          displayName: `${dep.dependentEntity} (${record.id.slice(0, 8)})`,
        });
      }
    } catch (err) {
      console.warn(`Failed to restore dependent ${dep.dependentEntity}:`, err);
    }
  }
}

/**
 * DELETE /api/administrative/trash/restore
 *
 * Permanently delete soft-deleted entities (cannot be undone)
 */
export async function DELETE(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
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
    const PrismaModel = getPrismaModelForEntity(entityType, database);
    if (!PrismaModel) {
      return NextResponse.json(
        { message: "Unknown entity type" },
        { status: 400 }
      );
    }

    // Verify the entity is soft-deleted before permanent delete
    const existing = await (PrismaModel as any).findFirst({
      where: {
        id: entityId,
        tenantId,
        deletedAt: { not: null },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Entity not found or not soft-deleted" },
        { status: 404 }
      );
    }

    // Permanently delete the record
    await (PrismaModel as any).delete({
      where: {
        id: entityId,
        tenantId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Entity permanently deleted",
    });
  } catch (error) {
    console.error("Error permanently deleting entity:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
