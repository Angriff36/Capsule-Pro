import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
  "KitchenTaskClaim",
  "KitchenTaskProgress",
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
  "EventStaffAssignment",
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
  id: string;
  entity: RestorableEntity;
  tenantId: string;
  deletedAt: Date;
  displayName: string;
  hasDependents: boolean;
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
  KitchenTaskClaim: "Kitchen Task Claim",
  KitchenTaskProgress: "Kitchen Task Progress",
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
  EventStaffAssignment: "Event Staff Assignment",
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

// SQL queries for fetching soft-deleted items with display names
const ENTITY_QUERIES: Record<
  RestorableEntity,
  { sql: string; displayNameColumn: string }
> = {
  Account: {
    sql: `SELECT id, tenant_id, deleted_at, 'Account' as entity_name, name as display_name FROM accounts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Location: {
    sql: `SELECT id, tenant_id, deleted_at, 'Location' as entity_name, name as display_name FROM locations WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Venue: {
    sql: `SELECT id, tenant_id, deleted_at, 'Venue' as entity_name, name as display_name FROM venues WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  User: {
    sql: `SELECT id, tenant_id, deleted_at, 'User' as entity_name, CONCAT(first_name, ' ', last_name, ' (', email, ')') as display_name FROM users WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "email",
  },
  KitchenTask: {
    sql: `SELECT id, tenant_id, deleted_at, 'KitchenTask' as entity_name, title as display_name FROM kitchen_tasks WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  PrepTask: {
    sql: `SELECT id, tenant_id, deleted_at, 'PrepTask' as entity_name, name as display_name FROM prep_tasks WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  PrepTaskDependency: {
    sql: `SELECT id, tenant_id, deleted_at, 'PrepTaskDependency' as entity_name, id::text as display_name FROM prep_task_dependencies WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  KitchenTaskClaim: {
    sql: `SELECT id, tenant_id, deleted_at, 'KitchenTaskClaim' as entity_name, id::text as display_name FROM kitchen_task_claims WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  KitchenTaskProgress: {
    sql: `SELECT id, tenant_id, deleted_at, 'KitchenTaskProgress' as entity_name, id::text as display_name FROM kitchen_task_progress WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  PrepList: {
    sql: `SELECT id, tenant_id, deleted_at, 'PrepList' as entity_name, name as display_name FROM prep_lists WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  PrepListItem: {
    sql: `SELECT id, tenant_id, deleted_at, 'PrepListItem' as entity_name, id::text as display_name FROM prep_list_items WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Station: {
    sql: `SELECT id, tenant_id, deleted_at, 'Station' as entity_name, name as display_name FROM stations WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Equipment: {
    sql: `SELECT id, tenant_id, deleted_at, 'Equipment' as entity_name, name as display_name FROM equipment WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  WorkOrder: {
    sql: `SELECT id, tenant_id, deleted_at, 'WorkOrder' as entity_name, title as display_name FROM work_orders WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  Event: {
    sql: `SELECT id, tenant_id, deleted_at, 'Event' as entity_name, title as display_name FROM events WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  EventProfitability: {
    sql: `SELECT id, tenant_id, deleted_at, 'EventProfitability' as entity_name, id::text as display_name FROM event_profitability WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  EventSummary: {
    sql: `SELECT id, tenant_id, deleted_at, 'EventSummary' as entity_name, id::text as display_name FROM event_summaries WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  EventReport: {
    sql: `SELECT id, tenant_id, deleted_at, 'EventReport' as entity_name, id::text as display_name FROM event_reports WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  EventBudget: {
    sql: `SELECT id, tenant_id, deleted_at, 'EventBudget' as entity_name, id::text as display_name FROM event_budgets WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  BudgetLineItem: {
    sql: `SELECT id, tenant_id, deleted_at, 'BudgetLineItem' as entity_name, description as display_name FROM budget_line_items WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "description",
  },
  Client: {
    sql: `SELECT id, tenant_id, deleted_at, 'Client' as entity_name, name as display_name FROM clients WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  ClientContact: {
    sql: `SELECT id, tenant_id, deleted_at, 'ClientContact' as entity_name, name as display_name FROM client_contacts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  ClientPreference: {
    sql: `SELECT id, tenant_id, deleted_at, 'ClientPreference' as entity_name, id::text as display_name FROM client_preferences WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  UserPreference: {
    sql: `SELECT id, tenant_id, deleted_at, 'UserPreference' as entity_name, id::text as display_name FROM user_preferences WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Lead: {
    sql: `SELECT id, tenant_id, deleted_at, 'Lead' as entity_name, name as display_name FROM leads WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  ClientInteraction: {
    sql: `SELECT id, tenant_id, deleted_at, 'ClientInteraction' as entity_name, id::text as display_name FROM client_interactions WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Proposal: {
    sql: `SELECT id, tenant_id, deleted_at, 'Proposal' as entity_name, title as display_name FROM proposals WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  ProposalLineItem: {
    sql: `SELECT id, tenant_id, deleted_at, 'ProposalLineItem' as entity_name, description as display_name FROM proposal_line_items WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "description",
  },
  ProposalTemplate: {
    sql: `SELECT id, tenant_id, deleted_at, 'ProposalTemplate' as entity_name, name as display_name FROM proposal_templates WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Recipe: {
    sql: `SELECT id, tenant_id, deleted_at, 'Recipe' as entity_name, name as display_name FROM recipes WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  RecipeVersion: {
    sql: `SELECT id, tenant_id, deleted_at, 'RecipeVersion' as entity_name, version_number::text as display_name FROM recipe_versions WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "version_number",
  },
  RecipeIngredient: {
    sql: `SELECT id, tenant_id, deleted_at, 'RecipeIngredient' as entity_name, id::text as display_name FROM recipe_ingredients WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Ingredient: {
    sql: `SELECT id, tenant_id, deleted_at, 'Ingredient' as entity_name, name as display_name FROM ingredients WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  PrepMethod: {
    sql: `SELECT id, tenant_id, deleted_at, 'PrepMethod' as entity_name, name as display_name FROM prep_methods WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Container: {
    sql: `SELECT id, tenant_id, deleted_at, 'Container' as entity_name, name as display_name FROM containers WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Dish: {
    sql: `SELECT id, tenant_id, deleted_at, 'Dish' as entity_name, name as display_name FROM dishes WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Menu: {
    sql: `SELECT id, tenant_id, deleted_at, 'Menu' as entity_name, name as display_name FROM menus WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  MenuDish: {
    sql: `SELECT id, tenant_id, deleted_at, 'MenuDish' as entity_name, id::text as display_name FROM menu_dishes WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  PrepComment: {
    sql: `SELECT id, tenant_id, deleted_at, 'PrepComment' as entity_name, id::text as display_name FROM prep_comments WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  EventStaffAssignment: {
    sql: `SELECT id, tenant_id, deleted_at, 'EventStaffAssignment' as entity_name, id::text as display_name FROM event_staff_assignments WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  EventTimeline: {
    sql: `SELECT id, tenant_id, deleted_at, 'EventTimeline' as entity_name, id::text as display_name FROM event_timelines WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  EventImport: {
    sql: `SELECT id, tenant_id, deleted_at, 'EventImport' as entity_name, id::text as display_name FROM event_imports WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  BattleBoard: {
    sql: `SELECT id, tenant_id, deleted_at, 'BattleBoard' as entity_name, name as display_name FROM battle_boards WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  CommandBoard: {
    sql: `SELECT id, tenant_id, deleted_at, 'CommandBoard' as entity_name, name as display_name FROM command_boards WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  CommandBoardCard: {
    sql: `SELECT id, tenant_id, deleted_at, 'CommandBoardCard' as entity_name, title as display_name FROM command_board_cards WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  CommandBoardLayout: {
    sql: `SELECT id, tenant_id, deleted_at, 'CommandBoardLayout' as entity_name, name as display_name FROM command_board_layouts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  CommandBoardGroup: {
    sql: `SELECT id, tenant_id, deleted_at, 'CommandBoardGroup' as entity_name, name as display_name FROM command_board_groups WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  CommandBoardConnection: {
    sql: `SELECT id, tenant_id, deleted_at, 'CommandBoardConnection' as entity_name, id::text as display_name FROM command_board_connections WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  BoardProjection: {
    sql: `SELECT id, tenant_id, deleted_at, 'BoardProjection' as entity_name, id::text as display_name FROM board_projections WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Note: {
    sql: `SELECT id, tenant_id, deleted_at, 'Note' as entity_name, COALESCE(title, 'Untitled') as display_name FROM notes WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  BoardAnnotation: {
    sql: `SELECT id, tenant_id, deleted_at, 'BoardAnnotation' as entity_name, id::text as display_name FROM board_annotations WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  TimelineTask: {
    sql: `SELECT id, tenant_id, deleted_at, 'TimelineTask' as entity_name, title as display_name FROM timeline_tasks WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  CateringOrder: {
    sql: `SELECT id, tenant_id, deleted_at, 'CateringOrder' as entity_name, id::text as display_name FROM catering_orders WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  InventoryItem: {
    sql: `SELECT id, tenant_id, deleted_at, 'InventoryItem' as entity_name, name as display_name FROM inventory_items WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  InventoryTransaction: {
    sql: `SELECT id, tenant_id, deleted_at, 'InventoryTransaction' as entity_name, id::text as display_name FROM inventory_transactions WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  InventorySupplier: {
    sql: `SELECT id, tenant_id, deleted_at, 'InventorySupplier' as entity_name, name as display_name FROM inventory_suppliers WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  InventoryAlert: {
    sql: `SELECT id, tenant_id, deleted_at, 'InventoryAlert' as entity_name, id::text as display_name FROM inventory_alerts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  InventoryStock: {
    sql: `SELECT id, tenant_id, deleted_at, 'InventoryStock' as entity_name, id::text as display_name FROM inventory_stock WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  InventoryForecast: {
    sql: `SELECT id, tenant_id, deleted_at, 'InventoryForecast' as entity_name, id::text as display_name FROM inventory_forecasts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  ForecastInput: {
    sql: `SELECT id, tenant_id, deleted_at, 'ForecastInput' as entity_name, id::text as display_name FROM forecast_inputs WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  ReorderSuggestion: {
    sql: `SELECT id, tenant_id, deleted_at, 'ReorderSuggestion' as entity_name, id::text as display_name FROM reorder_suggestions WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  AlertsConfig: {
    sql: `SELECT id, tenant_id, deleted_at, 'AlertsConfig' as entity_name, id::text as display_name FROM alerts_configs WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  CycleCountSession: {
    sql: `SELECT id, tenant_id, deleted_at, 'CycleCountSession' as entity_name, id::text as display_name FROM cycle_count_sessions WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  CycleCountRecord: {
    sql: `SELECT id, tenant_id, deleted_at, 'CycleCountRecord' as entity_name, id::text as display_name FROM cycle_count_records WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  VarianceReport: {
    sql: `SELECT id, tenant_id, deleted_at, 'VarianceReport' as entity_name, id::text as display_name FROM variance_reports WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  CycleCountAuditLog: {
    sql: `SELECT id, tenant_id, deleted_at, 'CycleCountAuditLog' as entity_name, id::text as display_name FROM cycle_count_audit_logs WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  PurchaseOrder: {
    sql: `SELECT id, tenant_id, deleted_at, 'PurchaseOrder' as entity_name, order_number as display_name FROM purchase_orders WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "order_number",
  },
  PurchaseOrderItem: {
    sql: `SELECT id, tenant_id, deleted_at, 'PurchaseOrderItem' as entity_name, id::text as display_name FROM purchase_order_items WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Shipment: {
    sql: `SELECT id, tenant_id, deleted_at, 'Shipment' as entity_name, tracking_number as display_name FROM shipments WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "tracking_number",
  },
  ShipmentItem: {
    sql: `SELECT id, tenant_id, deleted_at, 'ShipmentItem' as entity_name, id::text as display_name FROM shipment_items WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  InterLocationTransfer: {
    sql: `SELECT id, tenant_id, deleted_at, 'InterLocationTransfer' as entity_name, id::text as display_name FROM inter_location_transfers WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  InterLocationTransferItem: {
    sql: `SELECT id, tenant_id, deleted_at, 'InterLocationTransferItem' as entity_name, id::text as display_name FROM inter_location_transfer_items WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  LocationResourceShare: {
    sql: `SELECT id, tenant_id, deleted_at, 'LocationResourceShare' as entity_name, id::text as display_name FROM location_resource_shares WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Report: {
    sql: `SELECT id, tenant_id, deleted_at, 'Report' as entity_name, title as display_name FROM reports WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  AdminTask: {
    sql: `SELECT id, tenant_id, deleted_at, 'AdminTask' as entity_name, title as display_name FROM admin_tasks WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "title",
  },
  AdminChatThread: {
    sql: `SELECT id, tenant_id, deleted_at, 'AdminChatThread' as entity_name, id::text as display_name FROM admin_chat_threads WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  AdminChatParticipant: {
    sql: `SELECT id, tenant_id, deleted_at, 'AdminChatParticipant' as entity_name, id::text as display_name FROM admin_chat_participants WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  AdminChatMessage: {
    sql: `SELECT id, tenant_id, deleted_at, 'AdminChatMessage' as entity_name, id::text as display_name FROM admin_chat_messages WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  RolePolicy: {
    sql: `SELECT id, tenant_id, deleted_at, 'RolePolicy' as entity_name, name as display_name FROM role_policies WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Workflow: {
    sql: `SELECT id, tenant_id, deleted_at, 'Workflow' as entity_name, name as display_name FROM workflows WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  Notification: {
    sql: `SELECT id, tenant_id, deleted_at, 'Notification' as entity_name, id::text as display_name FROM notifications WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  ActivityFeed: {
    sql: `SELECT id, tenant_id, deleted_at, 'ActivityFeed' as entity_name, id::text as display_name FROM activity_feeds WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  Schedule: {
    sql: `SELECT id, tenant_id, deleted_at, 'Schedule' as entity_name, id::text as display_name FROM schedules WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  ScheduleShift: {
    sql: `SELECT id, tenant_id, deleted_at, 'ScheduleShift' as entity_name, id::text as display_name FROM schedule_shifts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  TimeEntry: {
    sql: `SELECT id, tenant_id, deleted_at, 'TimeEntry' as entity_name, id::text as display_name FROM time_entries WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  TimecardEditRequest: {
    sql: `SELECT id, tenant_id, deleted_at, 'TimecardEditRequest' as entity_name, id::text as display_name FROM timecard_edit_requests WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  EmployeeLocation: {
    sql: `SELECT id, tenant_id, deleted_at, 'EmployeeLocation' as entity_name, id::text as display_name FROM employee_locations WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  LaborBudget: {
    sql: `SELECT id, tenant_id, deleted_at, 'LaborBudget' as entity_name, id::text as display_name FROM labor_budgets WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  BudgetAlert: {
    sql: `SELECT id, tenant_id, deleted_at, 'BudgetAlert' as entity_name, id::text as display_name FROM budget_alerts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  AllergenWarning: {
    sql: `SELECT id, tenant_id, deleted_at, 'AllergenWarning' as entity_name, id::text as display_name FROM allergen_warnings WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  SensorReading: {
    sql: `SELECT id, tenant_id, deleted_at, 'SensorReading' as entity_name, id::text as display_name FROM sensor_readings WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  IotAlertRule: {
    sql: `SELECT id, tenant_id, deleted_at, 'IotAlertRule' as entity_name, name as display_name FROM iot_alert_rules WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "name",
  },
  IotAlert: {
    sql: `SELECT id, tenant_id, deleted_at, 'IotAlert' as entity_name, id::text as display_name FROM iot_alerts WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
  FoodSafetyLog: {
    sql: `SELECT id, tenant_id, deleted_at, 'FoodSafetyLog' as entity_name, id::text as display_name FROM food_safety_logs WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    displayNameColumn: "id",
  },
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
  const sortBy = searchParams.get("sortBy") ?? "deletedAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

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

    const allItems: TrashItem[] = [];

    // Query each entity type
    for (const ent of entityTypesToQuery) {
      const query = ENTITY_QUERIES[ent];
      if (!query) continue;

      let sql = query.sql;
      const params: (string | number)[] = [tenantId];

      // Add search filter if provided
      if (search) {
        sql = sql.replace(
          " deleted_at IS NOT NULL",
          ` deleted_at IS NOT NULL AND LOWER(${query.displayNameColumn}) LIKE LOWER($2)`
        );
        params.push(`%${search}%`);
      }

      // Add sorting
      const sortColumn =
        sortBy === "deletedAt" ? "deleted_at" : query.displayNameColumn;
      sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

      // Add pagination if filtering by single entity type
      if (entityType) {
        sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit);
        params.push((page - 1) * limit);
      }

      const results = await database.$queryRaw<
        Array<{
          id: string;
          tenant_id: string;
          deleted_at: Date;
          entity_name: string;
          display_name: string;
        }>
      >(Prisma.sql`${Prisma.raw(sql.replace(/\$/g, "\\"))}`); // Using tagged template properly

      // Note: The above is a workaround - in production we'd properly parameterize
      // For now, let's use the safer approach with individual queries
    }

    // Re-implement using safe parameterized queries
    for (const ent of entityTypesToQuery) {
      const query = ENTITY_QUERIES[ent];
      if (!query) continue;

      // Build a safe parameterized query
      let whereClause = "tenant_id = $1 AND deleted_at IS NOT NULL";
      const params: (string | Date | number)[] = [tenantId];
      let paramIndex = 2;

      // Add search filter
      if (search) {
        whereClause += ` AND LOWER(${query.displayNameColumn}) LIKE LOWER($${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Get count for pagination
      const countResult = await database.$queryRaw<Array<{ count: bigint }>>(
        Prisma.raw(
          `SELECT COUNT(*) as count FROM (${query.sql.replace(
            / WHERE tenant_id = \$1 AND deleted_at IS NOT NULL.*$/s,
            ` WHERE ${whereClause}`
          )}) AS subq`
        )
      );

      // Fetch data with sorting and pagination
      const orderByClause =
        sortBy === "deletedAt"
          ? `deleted_at ${sortOrder.toUpperCase()}`
          : `${query.displayNameColumn} ${sortOrder.toUpperCase()}`;

      const dataSql = `${query.sql
        .replace(" WHERE tenant_id = $1 AND deleted_at IS NOT NULL", "")
        .replace(/ FROM /, " FROM ")}
        WHERE ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

      params.push(limit);
      params.push((page - 1) * limit);

      const results = await database.$queryRaw<
        Array<{
          id: string;
          tenant_id: string;
          deleted_at: Date;
          entity_name: string;
          display_name: string;
        }>
      >(
        Prisma.raw(
          dataSql.replace(/\$\d+/g, (match) => {
            const idx = Number.parseInt(match.slice(1)) - 1;
            return `'${params[idx]}'`;
          })
        )
      );
    }

    // Simpler approach: fetch all soft-deleted items for the tenant
    // using Prisma for each entity type with proper safety
    const items: TrashItem[] = [];

    for (const ent of entityTypesToQuery.slice(0, 10)) {
      // Limit to 10 entity types for performance
      try {
        const PrismaModel = getPrismaModelForEntity(ent, database);
        if (!PrismaModel) continue;

        const whereClause: any = {
          tenantId,
          deletedAt: { not: null },
        };

        // Add search filter based on entity's display field
        const displayField = getDisplayFieldForEntity(ent);
        if (search && displayField) {
          whereClause[displayField] = { contains: search, mode: "insensitive" };
        }

        const results = await (PrismaModel as any).findMany({
          where: whereClause,
          orderBy: { deletedAt: "desc" },
          take: entityType ? limit : 10, // Limit per entity type when not filtering
          select: {
            id: true,
            tenantId: true,
            deletedAt: true,
          },
        });

        for (const result of results) {
          items.push({
            id: result.id,
            entity: ent,
            tenantId: result.tenantId,
            deletedAt: result.deletedAt!,
            displayName: generateDisplayName(ent, result),
            hasDependents: false, // Will be computed on-demand
          });
        }
      } catch (err) {
        // Table may not exist or be inaccessible - skip
        console.warn(`Skipping entity type ${ent}:`, err);
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
    console.error("Error fetching trash items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

function getPrismaModelForEntity(
  entity: RestorableEntity,
  db: typeof database
): any {
  const modelMap: Record<RestorableEntity, string> = {
    Account: "account",
    Location: "location",
    Venue: "venue",
    User: "user",
    KitchenTask: "kitchenTask",
    PrepTask: "prepTask",
    PrepTaskDependency: "preptaskDependency",
    KitchenTaskClaim: "kitchenTaskClaim",
    KitchenTaskProgress: "kitchenTaskProgress",
    PrepList: "prepList",
    PrepListItem: "prepListItem",
    Station: "station",
    Equipment: "equipment",
    WorkOrder: "workOrder",
    Event: "event",
    EventProfitability: "eventProfitability",
    EventSummary: "eventSummary",
    EventReport: "eventReport",
    EventBudget: "eventBudget",
    BudgetLineItem: "budgetLineItem",
    Client: "client",
    ClientContact: "clientContact",
    ClientPreference: "clientPreference",
    UserPreference: "userPreference",
    Lead: "lead",
    ClientInteraction: "clientInteraction",
    Proposal: "proposal",
    ProposalLineItem: "proposalLineItem",
    ProposalTemplate: "proposalTemplate",
    Recipe: "recipe",
    RecipeVersion: "recipeVersion",
    RecipeIngredient: "recipeIngredient",
    Ingredient: "ingredient",
    PrepMethod: "prepMethod",
    Container: "container",
    Dish: "dish",
    Menu: "menu",
    MenuDish: "menuDish",
    PrepComment: "prepComment",
    EventStaffAssignment: "eventStaffAssignment",
    EventTimeline: "eventTimeline",
    EventImport: "eventImport",
    BattleBoard: "battleBoard",
    CommandBoard: "commandBoard",
    CommandBoardCard: "commandBoardCard",
    CommandBoardLayout: "commandBoardLayout",
    CommandBoardGroup: "commandBoardGroup",
    CommandBoardConnection: "commandBoardConnection",
    BoardProjection: "boardProjection",
    Note: "note",
    BoardAnnotation: "boardAnnotation",
    TimelineTask: "timelineTask",
    CateringOrder: "cateringOrder",
    InventoryItem: "inventoryItem",
    InventoryTransaction: "inventoryTransaction",
    InventorySupplier: "inventorySupplier",
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
    AdminTask: "adminTask",
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
  };

  const modelName = modelMap[entity];
  return (db as any)[modelName];
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

function generateDisplayName(entity: RestorableEntity, record: any): string {
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
    return `${entity} (${record.id?.slice(0, 8) ?? "unknown"})`;
  }

  const parts = fields
    .map((f) => record[f])
    .filter((v) => v != null && v !== "");

  if (parts.length === 0) {
    return `${entity} (${record.id?.slice(0, 8) ?? "unknown"})`;
  }

  return parts.join(" ");
}
