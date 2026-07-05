import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  getDeletedAtField,
  getPrismaDelegate,
  getTenantField,
} from "@/lib/trash/entity-helpers";

export const runtime = "nodejs";

// Entity types that support soft-delete and can be restored
const RESTORABLE_ENTITIES = [
  "Account",
  "Location",
  "Venue",
  "User",
  "KitchenTask",
  "PrepTask",
  "PrepTaskDependency",
  // KitchenTaskClaim/KitchenTaskProgress removed: neither model has a
  // deletedAt column (claims use releasedAt; both are hard-delete) — every
  // trash-page load errored + skipped them.
  "PrepList",
  "PrepListItem",
  "Station",
  "Equipment",
  "WorkOrder",
  "Event",
  "EventProfitability",
  "EventSummary",
  "EventReport",
  "EventBudget",
  "BudgetLineItem",
  "Client",
  "ClientContact",
  "ClientPreference",
  "UserPreference",
  "Lead",
  "ClientInteraction",
  "Proposal",
  "ProposalLineItem",
  "ProposalTemplate",
  "Recipe",
  "RecipeVersion",
  "RecipeIngredient",
  "Ingredient",
  "PrepMethod",
  "Container",
  "Dish",
  "Menu",
  "MenuDish",
  "PrepComment",
  "EventStaff",
  "EventTimeline",
  "EventImport",
  "BattleBoard",
  "CommandBoard",
  "CommandBoardCard",
  "CommandBoardLayout",
  "CommandBoardGroup",
  "CommandBoardConnection",
  "BoardProjection",
  "Note",
  "BoardAnnotation",
  "TimelineTask",
  "CateringOrder",
  "InventoryItem",
  "InventoryTransaction",
  "InventorySupplier",
  "InventoryAlert",
  "InventoryStock",
  "InventoryForecast",
  "ForecastInput",
  "ReorderSuggestion",
  "AlertsConfig",
  "CycleCountSession",
  "CycleCountRecord",
  "VarianceReport",
  "CycleCountAuditLog",
  "PurchaseOrder",
  "PurchaseOrderItem",
  "Shipment",
  "ShipmentItem",
  "InterLocationTransfer",
  "InterLocationTransferItem",
  "LocationResourceShare",
  "Report",
  "AdminTask",
  "AdminChatThread",
  "AdminChatParticipant",
  "AdminChatMessage",
  "RolePolicy",
  "Workflow",
  "Notification",
  "ActivityFeed",
  "Schedule",
  "ScheduleShift",
  "TimeEntry",
  "TimecardEditRequest",
  "EmployeeLocation",
  "LaborBudget",
  "BudgetAlert",
  "AllergenWarning",
  "SensorReading",
  "IotAlertRule",
  "IotAlert",
  "FoodSafetyLog",
] as const;

type RestorableEntity = (typeof RESTORABLE_ENTITIES)[number];

interface TrashItem {
  deletedAt: Date;
  displayName: string;
  entity: RestorableEntity;
  hasDependents: boolean;
  id: string;
  tenantId: string;
}

// Display name mappings for entities
const ENTITY_DISPLAY_NAMES: Record<RestorableEntity, string> = {
  Account: "Account",
  Location: "Location",
  Venue: "Venue",
  User: "User",
  KitchenTask: "Kitchen Task",
  PrepTask: "Prep Task",
  PrepTaskDependency: "Prep Task Dependency",
  PrepList: "Prep List",
  PrepListItem: "Prep List Item",
  Station: "Station",
  Equipment: "Equipment",
  WorkOrder: "Work Order",
  Event: "Event",
  EventProfitability: "Event Profitability",
  EventSummary: "Event Summary",
  EventReport: "Event Report",
  EventBudget: "Event Budget",
  BudgetLineItem: "Budget Line Item",
  Client: "Client",
  ClientContact: "Client Contact",
  ClientPreference: "Client Preference",
  UserPreference: "User Preference",
  Lead: "Lead",
  ClientInteraction: "Client Interaction",
  Proposal: "Proposal",
  ProposalLineItem: "Proposal Line Item",
  ProposalTemplate: "Proposal Template",
  Recipe: "Recipe",
  RecipeVersion: "Recipe Version",
  RecipeIngredient: "Recipe Ingredient",
  Ingredient: "Ingredient",
  PrepMethod: "Prep Method",
  Container: "Container",
  Dish: "Dish",
  Menu: "Menu",
  MenuDish: "Menu Dish",
  PrepComment: "Prep Comment",
  EventStaff: "Event Staff",
  EventTimeline: "Event Timeline",
  EventImport: "Event Import",
  BattleBoard: "Battle Board",
  CommandBoard: "Command Board",
  CommandBoardCard: "Command Board Card",
  CommandBoardLayout: "Command Board Layout",
  CommandBoardGroup: "Command Board Group",
  CommandBoardConnection: "Command Board Connection",
  BoardProjection: "Board Projection",
  Note: "Note",
  BoardAnnotation: "Board Annotation",
  TimelineTask: "Timeline Task",
  CateringOrder: "Catering Order",
  InventoryItem: "Inventory Item",
  InventoryTransaction: "Inventory Transaction",
  InventorySupplier: "Inventory Supplier",
  InventoryAlert: "Inventory Alert",
  InventoryStock: "Inventory Stock",
  InventoryForecast: "Inventory Forecast",
  ForecastInput: "Forecast Input",
  ReorderSuggestion: "Reorder Suggestion",
  AlertsConfig: "Alerts Config",
  CycleCountSession: "Cycle Count Session",
  CycleCountRecord: "Cycle Count Record",
  VarianceReport: "Variance Report",
  CycleCountAuditLog: "Cycle Count Audit Log",
  PurchaseOrder: "Purchase Order",
  PurchaseOrderItem: "Purchase Order Item",
  Shipment: "Shipment",
  ShipmentItem: "Shipment Item",
  InterLocationTransfer: "Inter-Location Transfer",
  InterLocationTransferItem: "Inter-Location Transfer Item",
  LocationResourceShare: "Location Resource Share",
  Report: "Report",
  AdminTask: "Admin Task",
  AdminChatThread: "Admin Chat Thread",
  AdminChatParticipant: "Admin Chat Participant",
  AdminChatMessage: "Admin Chat Message",
  RolePolicy: "Role Policy",
  Workflow: "Workflow",
  Notification: "Notification",
  ActivityFeed: "Activity Feed",
  Schedule: "Schedule",
  ScheduleShift: "Schedule Shift",
  TimeEntry: "Time Entry",
  TimecardEditRequest: "Timecard Edit Request",
  EmployeeLocation: "Employee Location",
  LaborBudget: "Labor Budget",
  BudgetAlert: "Budget Alert",
  AllergenWarning: "Allergen Warning",
  SensorReading: "Sensor Reading",
  IotAlertRule: "IoT Alert Rule",
  IotAlert: "IoT Alert",
  FoodSafetyLog: "Food Safety Log",
};

/**
 * GET /api/administrative/trash/list
 *
 * List all soft-deleted entities with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const entityType = searchParams.get("entityType") as RestorableEntity | null;
  const search = searchParams.get("search") || "";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const sortByRaw = searchParams.get("sortBy") ?? "deletedAt";
  const sortOrderRaw = searchParams.get("sortOrder") ?? "desc";

  // Allowlist sort fields/directions — both are interpolated into Prisma `orderBy`
  // shapes below, so any value reaching the DB must come from this fixed set.
  const sortBy: "deletedAt" | "displayName" =
    sortByRaw === "displayName" ? "displayName" : "deletedAt";
  const sortOrder: "asc" | "desc" =
    sortOrderRaw.toLowerCase() === "asc" ? "asc" : "desc";

  if (page < 1 || limit < 1 || limit > 200) {
    return NextResponse.json(
      { message: "Invalid pagination parameters" },
      { status: 400 }
    );
  }

  if (entityType && !RESTORABLE_ENTITIES.includes(entityType)) {
    return NextResponse.json(
      { message: "Invalid entity type" },
      { status: 400 }
    );
  }

  try {
    // Build the list of entity types to query
    const entityTypesToQuery = entityType
      ? ([entityType] as RestorableEntity[])
      : RESTORABLE_ENTITIES;

    // Fetch soft-deleted items for the tenant via Prisma per entity type.
    // Two earlier loops that built dynamic SQL via `Prisma.raw` and manual
    // `$N` -> `'value'` substitution were removed in 2026-04-26 — they were
    // unused (their results were discarded by this third loop) but every call
    // still executed them, exposing classic SQL-injection vectors through
    // `sortOrder` and `search` parameters. See IMPLEMENTATION_PLAN.md CRIT-2.
    const items: TrashItem[] = [];

    for (const ent of entityTypesToQuery.slice(0, 10)) {
      // Limit to 10 entity types for performance
      try {
        const delegate = getPrismaDelegate(ent, database);
        if (!delegate) {
          continue;
        }

        const tenantField = getTenantField(ent);
        const deletedAtField = getDeletedAtField(ent);

        const whereClause: Record<string, unknown> = {
          [tenantField]: tenantId,
          [deletedAtField]: { not: null },
        };

        // Add search filter based on entity's display field
        const displayField = getDisplayFieldForEntity(ent);
        if (search && displayField) {
          whereClause[displayField] = { contains: search, mode: "insensitive" };
        }

        const results = (await delegate.findMany({
          where: whereClause,
          orderBy: { [deletedAtField]: "desc" },
          take: entityType ? limit : 10, // Limit per entity type when not filtering
          select: {
            id: true,
            [tenantField]: true,
            [deletedAtField]: true,
          },
        })) as Record<string, unknown>[];

        for (const result of results) {
          items.push({
            id: result.id as string,
            entity: ent,
            tenantId: result[tenantField] as string,
            deletedAt: result[deletedAtField] as Date,
            displayName: generateDisplayName(ent, result),
            hasDependents: false, // Will be computed on-demand
          });
        }
      } catch (err) {
        // Table may not exist or be inaccessible - skip
        log.warn(`Skipping entity type ${ent}:`, err);
      }
    }

    // Sort items
    items.sort((a, b) => {
      const modifier = sortOrder === "desc" ? -1 : 1;
      if (sortBy === "deletedAt") {
        return (a.deletedAt.getTime() - b.deletedAt.getTime()) * modifier;
      }
      return a.displayName.localeCompare(b.displayName) * modifier;
    });

    // Apply pagination across all items
    const total = items.length;
    const paginatedItems = items.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      entityTypes: RESTORABLE_ENTITIES.map((e) => ({
        value: e,
        label: ENTITY_DISPLAY_NAMES[e],
      })),
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching trash items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

function getDisplayFieldForEntity(entity: RestorableEntity): string | null {
  const fieldMap: Partial<Record<RestorableEntity, string>> = {
    Event: "title",
    Client: "name",
    Recipe: "name",
    User: "email",
    Venue: "name",
    Location: "name",
    Menu: "name",
    Dish: "name",
    Ingredient: "name",
    Proposal: "title",
    AdminTask: "title",
    WorkOrder: "title",
    KitchenTask: "title",
    PrepTask: "name",
    PrepList: "name",
    Equipment: "name",
    Station: "name",
    Container: "name",
    Note: "title",
    BattleBoard: "name",
    CommandBoard: "name",
    RecipeVersion: "versionNumber",
  };

  return fieldMap[entity] ?? null;
}

function generateDisplayName(
  entity: RestorableEntity,
  record: Record<string, unknown>
): string {
  const fieldMap: Partial<Record<RestorableEntity, string[]>> = {
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
  };

  const fields = fieldMap[entity];
  if (!fields) {
    return `${entity} (${(record.id as string | undefined)?.slice(0, 8) ?? "unknown"})`;
  }

  const parts = fields
    .map((f) => record[f])
    .filter((v) => v != null && v !== "");

  if (parts.length === 0) {
    return `${entity} (${(record.id as string | undefined)?.slice(0, 8) ?? "unknown"})`;
  }

  return parts.join(" ");
}
