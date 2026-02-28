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

// Default: generate kitchen IR with nextjs projection (route surface only).
// List surface routes need different output path handling and are not yet
// fully mapped via ENTITY_DOMAIN_MAP — kept as "route" to avoid malformed output.
const baseArgs =
  userArgs.length > 0
    ? userArgs
    : [
        defaultIr,
        "--projection",
        "nextjs",
        "--surface",
        "route",
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

/**
 * Load kitchen.commands.json and build the set of expected command route paths.
 * Returns a Set of normalized forward-slash relative paths like
 * "kitchen/prep-tasks/commands/create/route.ts".
 */
const loadExpectedCommandPaths = () => {
  const commandsManifestPath = resolve(
    repoRoot,
    "packages/manifest-ir/ir/kitchen/kitchen.commands.json"
  );
  if (!existsSync(commandsManifestPath)) {
    throw new Error(
      `[manifest/generate] kitchen.commands.json not found at ${commandsManifestPath}. Run manifest:compile first.`
    );
  }
  const commands = JSON.parse(readFileSync(commandsManifestPath, "utf8"));
  const expectedPaths = new Set();
  for (const cmd of commands) {
    const domain = ENTITY_DOMAIN_MAP[cmd.entity];
    if (!domain) {
      console.warn(
        `[manifest/generate] No domain mapping for entity "${cmd.entity}" in commands.json — skipping`
      );
      continue;
    }
    expectedPaths.add(`${domain}/commands/${cmd.command}/route.ts`);
  }
  return expectedPaths;
};

/**
 * Check if a normalized relative path is inside the commands namespace.
 */
const isCommandsNamespacePath = (relPath) => relPath.includes("/commands/");

/**
 * Detect exported HTTP methods from route file content.
 */
const detectExportedMethods = (content) => {
  const methods = [];
  const re =
    /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
  let match = re.exec(content);
  while (match) {
    methods.push(match[1]);
    match = re.exec(content);
  }
  return methods;
};

const materializeRemappedOutput = (stagingDir, outputDir) => {
  const copiedFiles = [];
  let skippedOverwriteCount = 0;

  // Load the commands manifest for forward/mirror/method validation
  const expectedCommandPaths = loadExpectedCommandPaths();
  const stagedCommandPaths = new Set();

  // First pass: collect all staged route files and their domain paths
  const stagedRoutes = [];
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

    stagedRoutes.push({ stagedFile, stagedContent, safeRelativePath });
  }

  // Validation pass: forward, mirror, and method checks
  const errors = [];

  for (const { stagedContent, safeRelativePath } of stagedRoutes) {
    const isCommandRoute = isCommandsNamespacePath(safeRelativePath);

    if (isCommandRoute) {
      stagedCommandPaths.add(safeRelativePath);

      // Forward check: every staged commands/* route must be in commands.json
      if (!expectedCommandPaths.has(safeRelativePath)) {
        errors.push(
          `FORWARD_CHECK_FAIL: Staged command route "${safeRelativePath}" has no entry in kitchen.commands.json`
        );
      }

      // Method check: commands namespace is write-only — no GET exports
      const methods = detectExportedMethods(stagedContent);
      if (methods.includes("GET")) {
        errors.push(
          `METHOD_CHECK_FAIL: Command route "${safeRelativePath}" exports GET — commands namespace is write-only`
        );
      }
    }
  }

  // Mirror/reverse check: every commands.json entry should have a staged route.
  // Currently the CLI only generates list (read) routes via --surface route.
  // Command routes are generated by a separate process or already exist on disk.
  // Log as warnings for visibility — will become errors when generator produces command routes.
  let mirrorMissCount = 0;
  for (const expectedPath of expectedCommandPaths) {
    if (!stagedCommandPaths.has(expectedPath)) {
      mirrorMissCount++;
    }
  }
  if (mirrorMissCount > 0) {
    console.warn(
      `[manifest/generate] Mirror check: ${mirrorMissCount} of ${expectedCommandPaths.size} command routes not in staging (expected — CLI generates list routes only)`
    );
  }

  if (errors.length > 0) {
    console.error(
      `[manifest/generate] Validation failed with ${errors.length} error(s):`
    );
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    throw new Error(
      `[manifest/generate] ${errors.length} validation error(s) — aborting materialization`
    );
  }

  // Copy pass: write files to output
  for (const { stagedFile, safeRelativePath } of stagedRoutes) {
    const isCommandRoute = isCommandsNamespacePath(safeRelativePath);
    const destinationPath = join(outputDir, safeRelativePath);

    if (isCommandRoute) {
      // Commands namespace: overwrite unconditionally (no marker check)
      mkdirSync(resolve(destinationPath, ".."), { recursive: true });
      copyFileSync(stagedFile, destinationPath);
      copiedFiles.push(destinationPath.replace(/\\/g, "/"));
    } else {
      // Non-commands: retain current behavior (skip non-generated files)
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
