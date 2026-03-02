#!/usr/bin/env node

/**
 * Generate Next.js API route handlers for ALL manifest entities.
 *
 * This script:
 * 1. Reads all .manifest files from packages/manifest-adapters/manifests/
 * 2. Compiles each to IR using the vendored @manifest/runtime compiler
 * 3. Uses NextJsProjection to generate command route handlers
 * 4. Writes route files to the correct domain directories under apps/api/app/api/
 *
 * Usage: node scripts/manifest/generate-all-routes.mjs [--dry-run]
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// ─── Domain routing: entity → API directory ───
// Maps each entity to its domain directory under apps/api/app/api/
const ENTITY_DOMAIN_MAP = {
  // Phase 0: Kitchen Operations (existing)
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

  // Phase 1: Kitchen Operations (new)
  PrepComment: "kitchen/prep-comments",
  Container: "kitchen/containers",
  PrepMethod: "kitchen/prep-methods",

  // Phase 2: Events & Catering
  Event: "events/event",
  EventProfitability: "events/profitability",
  EventSummary: "events/summaries",
  EventReport: "events/reports",
  EventBudget: "events/budgets",
  BudgetLineItem: "events/budget-line-items",
  CateringOrder: "events/catering-orders",
  BattleBoard: "events/battle-boards",

  // Phase 3: CRM & Sales
  Client: "crm/clients",
  ClientContact: "crm/client-contacts",
  ClientPreference: "crm/client-preferences",
  Lead: "crm/leads",
  Proposal: "crm/proposals",
  ProposalLineItem: "crm/proposal-line-items",
  ClientInteraction: "crm/client-interactions",

  // Phase 4: Purchasing & Inventory
  PurchaseOrder: "inventory/purchase-orders",
  PurchaseOrderItem: "inventory/purchase-order-items",
  Shipment: "shipments/shipment",
  ShipmentItem: "shipments/shipment-items",
  InventoryTransaction: "inventory/transactions",
  InventorySupplier: "inventory/suppliers",
  CycleCountSession: "inventory/cycle-count/sessions",
  CycleCountRecord: "inventory/cycle-count/records",
  VarianceReport: "inventory/cycle-count/variance-reports",

  // Phase 5: Staff & Scheduling
  User: "staff/employees",
  Schedule: "staff/schedules",
  ScheduleShift: "staff/shifts",
  TimeEntry: "timecards/entries",
  TimecardEditRequest: "timecards/edit-requests",

  // Phase 6: Command Board
  CommandBoard: "command-board/boards",
  CommandBoardCard: "command-board/cards",
  CommandBoardGroup: "command-board/groups",
  CommandBoardConnection: "command-board/connections",
  CommandBoardLayout: "command-board/layouts",

  // Phase 7: Workflows & Notifications
  Workflow: "collaboration/workflows",
  Notification: "collaboration/notifications",
};

// Entities that already have hand-written or previously generated command routes
// These will NOT be overwritten
const ENTITIES_WITH_EXISTING_ROUTES = new Set([
  "PrepTask",
  "KitchenTask",
  "Recipe",
  "RecipeVersion",
  "RecipeIngredient",
  "Ingredient",
  "Dish",
  "Menu",
  "MenuDish",
  "PrepList",
  "PrepListItem",
  "Station",
  "InventoryItem",
]);

const ROOT = resolve(process.cwd());
const MANIFESTS_DIR = join(ROOT, "packages/manifest-adapters/manifests");
const API_DIR = join(ROOT, "apps/api/app/api");

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/**
 * Generate a command route handler file content.
 * Matches the pattern from the NextJsProjection but with our specific imports.
 */
function generateCommandRoute(entityName, commandName) {
  return `// Auto-generated Next.js command handler for ${entityName}.${commandName}
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Resolve internal user from Clerk auth
    const currentUser = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const body = await request.json();

    console.log("[${toKebabCase(entityName)}/${commandName}] Executing command:", {
      entityName: "${entityName}",
      command: "${commandName}",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "${entityName}",
    });

    const result = await runtime.runCommand("${commandName}", body, {
      entityName: "${entityName}",
    });

    if (!result.success) {
      console.error("[${toKebabCase(entityName)}/${commandName}] Command failed:", {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          \`Access denied: \${result.policyDenial.policyName} (role=\${currentUser.role})\`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          \`Guard \${result.guardFailure.index} failed: \${result.guardFailure.formatted}\`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[${toKebabCase(entityName)}/${commandName}] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
`;
}

/**
 * Parse a manifest file to extract entity names and their commands.
 * Simple regex-based parser — doesn't need the full compiler.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Manifest parser with multiple states
function parseManifestCommands(source) {
  const entities = {};
  let currentEntity = null;
  let braceDepth = 0;
  let inEntity = false;

  const lines = source.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Match entity declaration
    const entityMatch = trimmed.match(/^entity\s+(\w+)\s*\{/);
    if (entityMatch && !inEntity) {
      currentEntity = entityMatch[1];
      entities[currentEntity] = [];
      inEntity = true;
      braceDepth = 1;
      continue;
    }

    if (inEntity) {
      // Count braces
      for (const ch of trimmed) {
        if (ch === "{") {
          braceDepth++;
        }
        if (ch === "}") {
          braceDepth--;
        }
      }

      // Match command declaration (at entity level, braceDepth >= 1)
      const commandMatch = trimmed.match(/^command\s+(\w+)/);
      if (commandMatch && braceDepth >= 1) {
        entities[currentEntity].push(commandMatch[1]);
      }

      // Entity closed
      if (braceDepth === 0) {
        inEntity = false;
        currentEntity = null;
      }
    }
  }

  return entities;
}

// ─── Main ───

console.log("=== Manifest Route Generator ===");
console.log(`Manifests dir: ${MANIFESTS_DIR}`);
console.log(`API output dir: ${API_DIR}`);
if (DRY_RUN) {
  console.log("DRY RUN — no files will be written\n");
}

const manifestFiles = readdirSync(MANIFESTS_DIR).filter((f) =>
  f.endsWith(".manifest")
);

console.log(`Found ${manifestFiles.length} manifest files\n`);

let totalRoutes = 0;
let skippedRoutes = 0;
let writtenRoutes = 0;
const errors = [];

for (const manifestFile of manifestFiles) {
  const manifestPath = join(MANIFESTS_DIR, manifestFile);
  const source = readFileSync(manifestPath, "utf-8");

  try {
    const entities = parseManifestCommands(source);

    for (const [entityName, commands] of Object.entries(entities)) {
      const domainDir = ENTITY_DOMAIN_MAP[entityName];
      if (!domainDir) {
        console.warn(
          `  WARN: No domain mapping for entity "${entityName}" in ${manifestFile} — skipping`
        );
        continue;
      }

      // Skip entities that already have routes
      if (ENTITIES_WITH_EXISTING_ROUTES.has(entityName)) {
        if (VERBOSE) {
          console.log(
            `  SKIP: ${entityName} (${commands.length} commands) — existing routes`
          );
        }
        skippedRoutes += commands.length;
        continue;
      }

      for (const commandName of commands) {
        totalRoutes++;
        const routeDir = join(
          API_DIR,
          domainDir,
          "commands",
          toKebabCase(commandName)
        );
        const routeFile = join(routeDir, "route.ts");

        // Don't overwrite existing non-generated files
        if (existsSync(routeFile)) {
          const existing = readFileSync(routeFile, "utf-8");
          if (!existing.includes("Generated from Manifest IR - DO NOT EDIT")) {
            console.warn(`  SKIP: ${routeFile} — non-generated file exists`);
            skippedRoutes++;
            continue;
          }
        }

        const content = generateCommandRoute(entityName, commandName);

        if (DRY_RUN) {
          console.log(`  WOULD WRITE: ${routeFile}`);
        } else {
          mkdirSync(routeDir, { recursive: true });
          writeFileSync(routeFile, content, "utf-8");
          if (VERBOSE) {
            console.log(`  WROTE: ${routeFile}`);
          }
        }
        writtenRoutes++;
      }

      console.log(
        `  ${entityName}: ${commands.length} commands → ${domainDir}/commands/`
      );
    }
  } catch (error) {
    console.error(`  ERROR processing ${manifestFile}:`, error.message);
    errors.push({ file: manifestFile, error: error.message });
  }
}

console.log("\n=== Summary ===");
console.log(`Total routes: ${totalRoutes}`);
console.log(`Written: ${writtenRoutes}`);
console.log(`Skipped (existing): ${skippedRoutes}`);
console.log(`Errors: ${errors.length}`);

if (errors.length > 0) {
  console.error("\nErrors:");
  for (const { file, error } of errors) {
    console.error(`  ${file}: ${error}`);
  }
  process.exit(1);
}

console.log("\nDone!");
