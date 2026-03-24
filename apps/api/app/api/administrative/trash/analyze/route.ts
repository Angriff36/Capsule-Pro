import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

interface DependencyNode {
  id: string;
  entity: string;
  displayName: string;
  isDeleted: boolean;
  canRestore: boolean;
  restoreOrder?: number;
}

interface DependencyEdge {
  from: string;
  to: string;
  type: "required" | "optional";
  description: string;
}

interface DependencyAnalysisResult {
  entity: {
    id: string;
    type: string;
    displayName: string;
  };
  summary: {
    totalDependents: number;
    deletedDependents: number;
    activeDependents: number;
    canRestore: boolean;
    recommendedAction: "restore" | "cascade_restore" | "cannot_restore";
  };
  dependents: Array<{
    node: DependencyNode;
    edge: DependencyEdge;
  }>;
  restorePlan?: {
    steps: Array<{
      entityId: string;
      entityType: string;
      displayName: string;
      action: "restore" | "skip";
      reason: string;
    }>;
    warnings: string[];
  };
}

// Entity dependency mappings - which entities reference which
// Format: { Entity: [{ referencedEntity, field, type, description }] }
const ENTITY_DEPENDENCIES: Record<
  string,
  Array<{
    referencedEntity: string;
    field: string;
    type: "required" | "optional";
    description: string;
  }>
> = {
  // Events are referenced by many entities
  Event: [
    {
      referencedEntity: "EventStaffAssignment",
      field: "eventId",
      type: "optional",
      description: "Staff assignments",
    },
    {
      referencedEntity: "EventTimeline",
      field: "eventId",
      type: "optional",
      description: "Timeline entries",
    },
    {
      referencedEntity: "EventBudget",
      field: "eventId",
      type: "optional",
      description: "Budgets",
    },
    {
      referencedEntity: "EventProfitability",
      field: "eventId",
      type: "optional",
      description: "Profitability records",
    },
    {
      referencedEntity: "EventSummary",
      field: "eventId",
      type: "optional",
      description: "Summary records",
    },
    {
      referencedEntity: "EventReport",
      field: "eventId",
      type: "optional",
      description: "Reports",
    },
    {
      referencedEntity: "EventDish",
      field: "eventId",
      type: "optional",
      description: "Event dishes",
    },
    {
      referencedEntity: "EventGuest",
      field: "eventId",
      type: "optional",
      description: "Guest lists",
    },
    {
      referencedEntity: "CateringOrder",
      field: "eventId",
      type: "optional",
      description: "Catering orders",
    },
  ],
  // Clients are referenced by
  Client: [
    {
      referencedEntity: "Event",
      field: "clientId",
      type: "optional",
      description: "Events",
    },
    {
      referencedEntity: "ClientContact",
      field: "clientId",
      type: "required",
      description: "Contacts",
    },
    {
      referencedEntity: "ClientPreference",
      field: "clientId",
      type: "required",
      description: "Preferences",
    },
    {
      referencedEntity: "ClientInteraction",
      field: "clientId",
      type: "required",
      description: "Interactions",
    },
    {
      referencedEntity: "Proposal",
      field: "clientId",
      type: "optional",
      description: "Proposals",
    },
    {
      referencedEntity: "Lead",
      field: "clientId",
      type: "optional",
      description: "Leads",
    },
  ],
  // Recipes are referenced by
  Recipe: [
    {
      referencedEntity: "RecipeVersion",
      field: "recipeId",
      type: "required",
      description: "Versions",
    },
    {
      referencedEntity: "RecipeIngredient",
      field: "recipeId",
      type: "optional",
      description: "Ingredients",
    },
    {
      referencedEntity: "MenuDish",
      field: "recipeId",
      type: "optional",
      description: "Menu dishes",
    },
    {
      referencedEntity: "PrepTask",
      field: "recipeId",
      type: "optional",
      description: "Prep tasks",
    },
    {
      referencedEntity: "EventDish",
      field: "recipeId",
      type: "optional",
      description: "Event dishes",
    },
  ],
  // Ingredients are referenced by
  Ingredient: [
    {
      referencedEntity: "RecipeIngredient",
      field: "ingredientId",
      type: "required",
      description: "Recipe ingredients",
    },
    {
      referencedEntity: "InventoryItem",
      field: "ingredientId",
      type: "optional",
      description: "Inventory items",
    },
    {
      referencedEntity: "AllergenWarning",
      field: "ingredientId",
      type: "optional",
      description: "Allergen warnings",
    },
  ],
  // Menus are referenced by
  Menu: [
    {
      referencedEntity: "MenuDish",
      field: "menuId",
      type: "required",
      description: "Menu dishes",
    },
    {
      referencedEntity: "Event",
      field: "menuId",
      type: "optional",
      description: "Events",
    },
  ],
  // Dishes are referenced by
  Dish: [
    {
      referencedEntity: "MenuDish",
      field: "dishId",
      type: "required",
      description: "Menu dishes",
    },
    {
      referencedEntity: "EventDish",
      field: "dishId",
      type: "required",
      description: "Event dishes",
    },
    {
      referencedEntity: "PrepTask",
      field: "dishId",
      type: "optional",
      description: "Prep tasks",
    },
  ],
  // Locations are referenced by
  Location: [
    {
      referencedEntity: "Event",
      field: "locationId",
      type: "optional",
      description: "Events",
    },
    {
      referencedEntity: "InventoryItem",
      field: "locationId",
      type: "optional",
      description: "Inventory items",
    },
    {
      referencedEntity: "Schedule",
      field: "locationId",
      type: "optional",
      description: "Schedules",
    },
    {
      referencedEntity: "EmployeeLocation",
      field: "locationId",
      type: "required",
      description: "Employee assignments",
    },
    {
      referencedEntity: "Shipment",
      field: "originLocationId",
      type: "optional",
      description: "Shipments (origin)",
    },
    {
      referencedEntity: "Shipment",
      field: "destinationLocationId",
      type: "optional",
      description: "Shipments (destination)",
    },
  ],
  // Users are referenced by
  User: [
    {
      referencedEntity: "KitchenTaskClaim",
      field: "userId",
      type: "required",
      description: "Task claims",
    },
    {
      referencedEntity: "KitchenTaskProgress",
      field: "userId",
      type: "required",
      description: "Task progress",
    },
    {
      referencedEntity: "TimeEntry",
      field: "userId",
      type: "required",
      description: "Time entries",
    },
    {
      referencedEntity: "EventStaffAssignment",
      field: "userId",
      type: "required",
      description: "Staff assignments",
    },
    {
      referencedEntity: "ScheduleShift",
      field: "userId",
      type: "required",
      description: "Shift assignments",
    },
    {
      referencedEntity: "ClientInteraction",
      field: "userId",
      type: "optional",
      description: "Client interactions",
    },
  ],
  // Vendors
  InventorySupplier: [
    {
      referencedEntity: "PurchaseOrder",
      field: "supplierId",
      type: "optional",
      description: "Purchase orders",
    },
    {
      referencedEntity: "InventoryItem",
      field: "preferredSupplierId",
      type: "optional",
      description: "Inventory items",
    },
  ],
  // Prep Lists
  PrepList: [
    {
      referencedEntity: "PrepListItem",
      field: "prepListId",
      type: "required",
      description: "List items",
    },
    {
      referencedEntity: "PrepTask",
      field: "prepListId",
      type: "optional",
      description: "Prep tasks",
    },
  ],
  // Stations
  Station: [
    {
      referencedEntity: "InventoryItem",
      field: "defaultStationId",
      type: "optional",
      description: "Inventory items",
    },
    {
      referencedEntity: "PrepTask",
      field: "stationId",
      type: "optional",
      description: "Prep tasks",
    },
  ],
};

// Reverse mapping: which entities might be dependent on a given entity
function getPotentialDependents(entityType: string): string[] {
  const dependents: string[] = [];
  for (const [entity, deps] of Object.entries(ENTITY_DEPENDENCIES)) {
    for (const dep of deps) {
      if (dep.referencedEntity === entityType) {
        dependents.push(entity);
      }
    }
  }
  return dependents;
}

/**
 * GET /api/administrative/trash/analyze
 *
 * Analyze dependencies for a soft-deleted entity before restoration
 */
export async function GET(request: NextRequest) {
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
    // First, verify the entity exists and is soft-deleted
    const entity = await findSoftDeletedEntity(tenantId, entityId, entityType);
    if (!entity) {
      return NextResponse.json(
        { message: "Entity not found or not soft-deleted" },
        { status: 404 }
      );
    }

    // Analyze dependencies
    const result = await analyzeEntityDependencies(
      tenantId,
      entityId,
      entityType,
      entity
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error analyzing entity dependencies:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function findSoftDeletedEntity(
  tenantId: string,
  entityId: string,
  entityType: string
): Promise<Record<string, any> | null> {
  try {
    const PrismaModel = getPrismaModelForEntity(entityType, database);
    if (!PrismaModel) return null;

    const result = await (PrismaModel as any).findFirst({
      where: {
        id: entityId,
        tenantId,
        deletedAt: { not: null },
      },
    });

    return result;
  } catch {
    return null;
  }
}

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
  };

  const modelName = modelMap[entityType];
  return (db as any)[modelName];
}

async function analyzeEntityDependencies(
  tenantId: string,
  entityId: string,
  entityType: string,
  entity: Record<string, any>
): Promise<DependencyAnalysisResult> {
  const dependents: Array<{ node: DependencyNode; edge: DependencyEdge }> = [];
  const potentialDependentTypes = getPotentialDependents(entityType);

  let deletedDependents = 0;
  let activeDependents = 0;

  // Check each potential dependent type
  for (const dependentType of potentialDependentTypes) {
    const dependencies = ENTITY_DEPENDENCIES[dependentType] || [];
    const relevantDependency = dependencies.find(
      (d) => d.referencedEntity === entityType
    );

    if (!relevantDependency) continue;

    try {
      const PrismaModel = getPrismaModelForEntity(dependentType, database);
      if (!PrismaModel) continue;

      // Find both active and soft-deleted dependents
      const records = await (PrismaModel as any).findMany({
        where: {
          tenantId,
          [relevantDependency.field]: entityId,
        },
        select: {
          id: true,
          deletedAt: true,
        },
        take: 50, // Limit results
      });

      for (const record of records) {
        const isDeleted = record.deletedAt !== null;
        if (isDeleted) {
          deletedDependents++;
        } else {
          activeDependents++;
        }

        dependents.push({
          node: {
            id: record.id,
            entity: dependentType,
            displayName: generateDisplayName(dependentType, record),
            isDeleted,
            canRestore: true, // If deleted, can be restored
          },
          edge: {
            from: entityId,
            to: record.id,
            type: relevantDependency.type,
            description: relevantDependency.description,
          },
        });
      }
    } catch (err) {
      console.warn(`Failed to query dependents of type ${dependentType}:`, err);
    }
  }

  // Determine if restoration is safe
  const hasActiveDependents = activeDependents > 0;
  const canRestore =
    !hasActiveDependents ||
    dependents.every((d) => d.node.isDeleted || d.edge.type === "optional");

  let recommendedAction: DependencyAnalysisResult["summary"]["recommendedAction"];
  if (!hasActiveDependents && deletedDependents === 0) {
    recommendedAction = "restore";
  } else if (hasActiveDependents) {
    // Check if all active dependents are optional relationships
    const hasRequiredActiveDependents = dependents.some(
      (d) => !d.node.isDeleted && d.edge.type === "required"
    );
    if (hasRequiredActiveDependents) {
      recommendedAction = "cannot_restore";
    } else {
      recommendedAction = "restore";
    }
  } else {
    recommendedAction = "cascade_restore";
  }

  // Build restore plan
  const restorePlan: DependencyAnalysisResult["restorePlan"] = {
    steps: [],
    warnings: [],
  };

  if (hasActiveDependents) {
    const requiredActive = dependents.filter(
      (d) => !d.node.isDeleted && d.edge.type === "required"
    );
    if (requiredActive.length > 0) {
      restorePlan.warnings.push(
        `This entity has ${requiredActive.length} required active dependent(s). Restoration may cause data integrity issues.`
      );
      recommendedAction = "cannot_restore";
    }
  }

  // Add restore steps for deleted dependents (cascade restore)
  const deletedDependentList = dependents.filter((d) => d.node.isDeleted);
  for (const dep of deletedDependentList) {
    restorePlan.steps.push({
      entityId: dep.node.id,
      entityType: dep.node.entity,
      displayName: dep.node.displayName,
      action: "restore",
      reason: `Dependent via ${dep.edge.description}`,
    });
  }

  // Add the main entity as final step
  restorePlan.steps.push({
    entityId,
    entityType,
    displayName: generateDisplayName(entityType, entity),
    action: "restore",
    reason: "Primary entity",
  });

  // Check for circular dependencies or other issues
  if (deletedDependents > 10) {
    restorePlan.warnings.push(
      `This entity has ${deletedDependents} deleted dependent(s). Consider restoring dependents first.`
    );
  }

  return {
    entity: {
      id: entityId,
      type: entityType,
      displayName: generateDisplayName(entityType, entity),
    },
    summary: {
      totalDependents: dependents.length,
      deletedDependents,
      activeDependents,
      canRestore: recommendedAction !== "cannot_restore",
      recommendedAction,
    },
    dependents,
    restorePlan:
      restorePlan.steps.length > 1 || restorePlan.warnings.length > 0
        ? restorePlan
        : undefined,
  };
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
