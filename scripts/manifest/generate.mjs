#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const defaultIr = resolve(
  repoRoot,
  "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
);
// Output root: apps/api/app/api — routes are placed into domain subdirs via ENTITY_DOMAIN_MAP
const defaultOutput = resolve(repoRoot, "apps/api/app/api");

const userArgs = process.argv.slice(2);

// Default: generate kitchen IR with nextjs projection (all surfaces)
const baseArgs =
  userArgs.length > 0
    ? userArgs
    : [
        defaultIr,
        "--projection",
        "nextjs",
        "--surface",
        "all",
        "--output",
        defaultOutput,
      ];

const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

// Maps each entity to its actual domain directory under apps/api/app/api/.
// Must stay in sync with ENTITY_DOMAIN_MAP in scripts/manifest/generate-all-routes.mjs
// and ENTITY_DOMAIN_MAP in scripts/manifest/generate-route-manifest.ts.
const ENTITY_DOMAIN_MAP = {
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
  WasteEntry: "kitchen/waste-entries",
  AllergenWarning: "kitchen/allergen-warnings",
  AlertsConfig: "kitchen/alerts-config",
  OverrideAudit: "kitchen/override-audits",
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
  // Command Board
  CommandBoard: "command-board/boards",
  CommandBoardCard: "command-board/cards",
  CommandBoardGroup: "command-board/groups",
  CommandBoardConnection: "command-board/connections",
  CommandBoardLayout: "command-board/layouts",
  // Workflows & Notifications
  Workflow: "collaboration/workflows",
  Notification: "collaboration/notifications",
};

// Build a reverse map: flat entity segment → domain path
// The CLI generates paths like "event/create/route.ts" — we need to remap to "events/event/commands/create/route.ts"
function toEntitySegment(entityName) {
  return entityName.toLowerCase();
}

const FLAT_SEGMENT_TO_DOMAIN = {};
for (const [entity, domain] of Object.entries(ENTITY_DOMAIN_MAP)) {
  FLAT_SEGMENT_TO_DOMAIN[toEntitySegment(entity)] = domain;
}

/**
 * Remap a staged relative path from the CLI's flat scheme to the domain scheme.
 *
 * CLI generates:  apps/api/app/api/event/create/route.ts
 * We want:        events/event/commands/create/route.ts  (relative to apps/api/app/api/)
 *
 * CLI generates:  apps/api/app/api/event/list/route.ts
 * We want:        events/event/list/route.ts
 */
function remapToDomainPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");

  // Strip the apps/api/app/api/ prefix that the CLI adds
  const apiPrefix = "apps/api/app/api/";
  if (!normalized.startsWith(apiPrefix)) {
    return null; // Not an API route — skip (types, client, etc.)
  }

  const afterApi = normalized.slice(apiPrefix.length);
  // afterApi is like: event/create/route.ts  or  event/list/route.ts  or  event/:id/route.ts
  const parts = afterApi.split("/");
  if (parts.length < 2) return null;

  const entitySegment = parts[0];
  const domain = FLAT_SEGMENT_TO_DOMAIN[entitySegment];
  if (!domain) {
    console.warn(
      `[manifest/generate] No domain mapping for entity segment "${entitySegment}" — skipping`
    );
    return null;
  }

  const rest = parts.slice(1); // e.g. ["create", "route.ts"] or ["list", "route.ts"]
  const routeFile = rest[rest.length - 1]; // "route.ts"
  const commandOrAction = rest.slice(0, -1).join("/"); // e.g. "create" or ":id"

  // Command routes (non-list, non-:id) go under commands/
  const isReadRoute =
    commandOrAction === "list" ||
    commandOrAction.startsWith(":") ||
    commandOrAction === "";

  const domainPath = isReadRoute
    ? `${domain}/${commandOrAction}/${routeFile}`
    : `${domain}/commands/${commandOrAction}/${routeFile}`;

  return domainPath;
}

const GENERATED_MARKERS = [
  "Generated from Manifest IR - DO NOT EDIT",
  "@generated",
  "DO NOT EDIT - Changes will be overwritten",
];

const hasGeneratedMarker = (fileContents) =>
  GENERATED_MARKERS.some((marker) => fileContents.includes(marker));

const collectFiles = (rootDir) => {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!(current && existsSync(current))) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
  return files;
};

const getOutputDirFromArgs = (cliArgs) => {
  const outputFlagIndex = cliArgs.indexOf("--output");
  if (outputFlagIndex >= 0 && cliArgs[outputFlagIndex + 1]) {
    return cliArgs[outputFlagIndex + 1];
  }
  return defaultOutput;
};

const setOutputDirInArgs = (cliArgs, newOutputDir) => {
  const nextArgs = [...cliArgs];
  const outputFlagIndex = nextArgs.indexOf("--output");
  if (outputFlagIndex >= 0) {
    nextArgs[outputFlagIndex + 1] = newOutputDir;
    return nextArgs;
  }
  return [...nextArgs, "--output", newOutputDir];
};

const materializeRemappedOutput = (stagingDir, outputDir) => {
  const copiedFiles = [];
  let skippedOverwriteCount = 0;

  for (const stagedFile of collectFiles(stagingDir).filter((f) =>
    f.endsWith("route.ts")
  )) {
    const stagedContent = readFileSync(stagedFile, "utf8");
    if (!hasGeneratedMarker(stagedContent)) continue;

    const stagedRelativePath = relative(stagingDir, stagedFile);
    const domainRelativePath = remapToDomainPath(stagedRelativePath);
    if (!domainRelativePath) continue;

    const safeRelativePath = domainRelativePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (
      safeRelativePath.length === 0 ||
      safeRelativePath.startsWith("../") ||
      safeRelativePath.includes("/../")
    ) {
      throw new Error(
        `[manifest/generate] Refusing to write unsafe path: ${stagedRelativePath}`
      );
    }

    const destinationPath = join(outputDir, safeRelativePath);
    if (existsSync(destinationPath)) {
      const destinationContent = readFileSync(destinationPath, "utf8");
      if (!hasGeneratedMarker(destinationContent)) {
        console.warn(
          `[manifest/generate] Skipping overwrite of non-generated route: ${destinationPath.replace(/\\/g, "/")}`
        );
        skippedOverwriteCount += 1;
        continue;
      }
    }

    mkdirSync(resolve(destinationPath, ".."), { recursive: true });
    copyFileSync(stagedFile, destinationPath);
    copiedFiles.push(destinationPath.replace(/\\/g, "/"));
  }

  return { copiedFiles, skippedOverwriteCount };
};

const outputDir = resolve(getOutputDirFromArgs(baseArgs));
const stagingDir = resolve(
  ".tmp",
  `manifest-generate-staging-${Date.now()}-${process.pid}`
);
mkdirSync(stagingDir, { recursive: true });

// Use the installed @angriff36/manifest CLI (pnpm exec manifest generate)
// The local vendored CLI at packages/manifest-runtime/packages/cli has a broken
// NextJsProjection import due to ESM/CJS interop issues with the workspace package.
const invocationArgs = [
  "exec",
  "manifest",
  "generate",
  ...setOutputDirInArgs(baseArgs, stagingDir),
];

const result = spawnSync(pnpmBin, invocationArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
  cwd: repoRoot,
});

let guardFailure = false;
let copiedFiles = [];
let skippedOverwriteCount = 0;

if (result.status === 0) {
  try {
    const materializeResult = materializeRemappedOutput(stagingDir, outputDir);
    copiedFiles = materializeResult.copiedFiles;
    skippedOverwriteCount = materializeResult.skippedOverwriteCount;
  } catch (error) {
    console.error(
      `[manifest/generate] Failed while remapping generated output: ${error instanceof Error ? error.message : String(error)}`
    );
    guardFailure = true;
  }
}

if (existsSync(stagingDir)) {
  rmSync(stagingDir, { recursive: true, force: true });
}

if (copiedFiles.length > 0) {
  console.log(`[manifest/generate] Copied files (${copiedFiles.length}):`);
  for (const copiedFile of copiedFiles) {
    console.log(`  - ${copiedFile}`);
  }
} else {
  console.log("[manifest/generate] Copied files (0):");
}

if (skippedOverwriteCount > 0) {
  console.log(
    `[manifest/generate] Skipped non-generated overwrites: ${skippedOverwriteCount}`
  );
}

if (result.status !== 0) {
  console.error(
    "[manifest/generate] Generation failed. Check @angriff36/manifest CLI output above."
  );
  process.exit(1);
}

if (guardFailure) {
  process.exit(1);
}
