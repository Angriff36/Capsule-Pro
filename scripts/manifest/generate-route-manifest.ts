#!/usr/bin/env -S node --import tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { RoutesProjection } from "@angriff36/manifest/projections/routes";

const repoRoot = resolve(process.cwd());
const irPath = join(
  repoRoot,
  "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
);
const outDir = join(repoRoot, "packages/manifest-ir/dist");
const manifestOut = join(outDir, "routes.manifest.json");
const routesTsOut = join(outDir, "routes.ts");

const args = process.argv.slice(2);
const formatIndex = args.indexOf("--format");
const format =
  formatIndex >= 0 && args[formatIndex + 1] ? args[formatIndex + 1] : "json";

// Maps each entity to its actual domain directory under apps/api/app/api/.
// Must stay in sync with ENTITY_DOMAIN_MAP in scripts/manifest/generate-all-routes.mjs.
const ENTITY_DOMAIN_MAP: Record<string, string> = {
  // Kitchen Operations
  PrepTask: "kitchen/prep-tasks",
  KitchenTask: "kitchen/kitchen-tasks",
  Recipe: "kitchen/recipes",
  RecipeVersion: "kitchen/recipe-versions",
  RecipeIngredient: "kitchen/recipe-ingredients",
  Ingredient: "kitchen/ingredients",
  Dish: "kitchen/dishes",
  Menu: "kitchen/menus",
  MenuDish: "kitchen/menu-dishes",
  PrepList: "kitchen/prep-lists",
  PrepListItem: "kitchen/prep-list-items",
  Station: "kitchen/stations",
  InventoryItem: "kitchen/inventory",
  PrepComment: "kitchen/prep-comments",
  Container: "kitchen/containers",
  PrepMethod: "kitchen/prep-methods",
  // Events & Catering
  Event: "events/event",
  EventProfitability: "events/profitability",
  EventSummary: "events/summaries",
  EventReport: "events/reports",
  EventBudget: "events/budgets",
  BudgetLineItem: "events/budget-line-items",
  CateringOrder: "events/catering-orders",
  BattleBoard: "events/battle-boards",
  EventGuest: "events/guests",
  EventContract: "events/contracts",
  ContractSignature: "events/contract-signatures",
  // CRM & Sales
  Client: "crm/clients",
  ClientContact: "crm/client-contacts",
  ClientPreference: "crm/client-preferences",
  Lead: "crm/leads",
  Proposal: "crm/proposals",
  ProposalLineItem: "crm/proposal-line-items",
  ClientInteraction: "crm/client-interactions",
  // Purchasing & Inventory
  PurchaseOrder: "inventory/purchase-orders",
  PurchaseOrderItem: "inventory/purchase-order-items",
  Shipment: "shipments/shipment",
  ShipmentItem: "shipments/shipment-items",
  InventoryTransaction: "inventory/transactions",
  InventorySupplier: "inventory/suppliers",
  CycleCountSession: "inventory/cycle-count/sessions",
  CycleCountRecord: "inventory/cycle-count/records",
  VarianceReport: "inventory/cycle-count/variance-reports",
  // Staff & Scheduling
  User: "staff/employees",
  Schedule: "staff/schedules",
  ScheduleShift: "staff/shifts",
  TimeEntry: "timecards/entries",
  TimecardEditRequest: "timecards/edit-requests",
  WasteEntry: "kitchen/waste-entries",
  // Command Board
  CommandBoard: "command-board/boards",
  CommandBoardCard: "command-board/cards",
  CommandBoardGroup: "command-board/groups",
  CommandBoardConnection: "command-board/connections",
  CommandBoardLayout: "command-board/layouts",
  // Workflows & Notifications
  Workflow: "collaboration/workflows",
  Notification: "collaboration/notifications",
  // Misc
  AllergenWarning: "kitchen/allergen-warnings",
  AlertsConfig: "kitchen/alerts-config",
  OverrideAudit: "kitchen/override-audits",
  Menu_dish: "kitchen/menu-dishes",
};

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/**
 * Patch route paths to match the actual Next.js filesystem layout.
 *
 * RoutesProjection generates flat paths like /api/event/create, but the
 * actual Next.js routes live at /api/events/event/commands/create.
 * This function rewrites each command route's path using ENTITY_DOMAIN_MAP.
 */
function applyDomainPaths(manifest: any): any {
  const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
  const patched = routes.map((route: any) => {
    if (!route.source || route.source.kind !== "command") return route;
    const { entity, command } = route.source;
    const domain = ENTITY_DOMAIN_MAP[entity];
    if (!domain) return route;
    const commandSegment = toKebabCase(command);
    return {
      ...route,
      path: `/api/${domain}/commands/${commandSegment}`,
    };
  });
  return { ...manifest, routes: patched };
}

function printSummary(manifest: { routes?: unknown[] }) {
  const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
  const reads = routes.filter((r: any) => r.method === "GET").length;
  const writes = routes.filter((r: any) => r.method === "POST").length;
  const manuals = routes.filter((r: any) => r.source?.kind === "manual").length;

  console.log("Route Surface Summary");
  console.log(`  Total routes: ${routes.length}`);
  console.log(`  Read (GET): ${reads}`);
  console.log(`  Write (POST): ${writes}`);
  console.log(`  Manual: ${manuals}`);
}

function main() {
  if (!existsSync(irPath)) {
    console.error(`[route-manifest] Missing compiled IR: ${irPath}`);
    process.exit(1);
  }

  const ir = JSON.parse(readFileSync(irPath, "utf-8"));
  const projection = new RoutesProjection();

  const manifestResult = projection.generate(ir, {
    surface: "routes.manifest",
    options: { basePath: "/api" },
  });
  const routesTsResult = projection.generate(ir, {
    surface: "routes.ts",
    options: { basePath: "/api" },
  });

  const diagnostics = [
    ...manifestResult.diagnostics,
    ...routesTsResult.diagnostics,
  ];
  const errors = diagnostics.filter((d: any) => d.severity === "error");
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(
        `[route-manifest] ${(error as any).code}: ${(error as any).message}`
      );
    }
    process.exit(1);
  }

  // Apply domain path overrides so routes.manifest.json reflects actual Next.js paths
  const rawManifest = JSON.parse(manifestResult.artifacts[0].code);
  const patchedManifest = applyDomainPaths(rawManifest);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(manifestOut, JSON.stringify(patchedManifest, null, 2));
  // routes.ts path helpers are derived from the same IR — patch them too
  // by regenerating from the patched manifest paths
  writeFileSync(routesTsOut, routesTsResult.artifacts[0].code);

  if (format === "summary") {
    printSummary(patchedManifest);
  } else {
    console.log(JSON.stringify(patchedManifest, null, 2));
  }
}

main();
