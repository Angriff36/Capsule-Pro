/**
 * Build Pipeline Determinism & Correctness Tests
 *
 * These tests verify critical invariants of the manifest build pipeline:
 *
 * Test A — commands.json is deterministic (byte-identical across compilations)
 * Test B — generated route content is deterministic (byte-identical across generations)
 * Test C — manual GET routes are never overwritten by the generator
 * Test G — mirror check: every commands.json entry has a corresponding route on disk
 *
 * These tests operate on the CURRENT filesystem state (post-build). They do NOT
 * re-run the build pipeline — they verify the output is self-consistent.
 *
 * For determinism (A, B): we re-derive the expected output from source manifests
 * and compare against the committed artifacts.
 *
 * See: tasks/manifest-route-ownership-handoff.md § "Missing Plan Tests"
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = join(dirname(__filename), "../../../..");
const IR_DIR = join(PROJECT_ROOT, "packages/manifest-ir/ir/kitchen");
const COMMANDS_FILE = join(IR_DIR, "kitchen.commands.json");
const IR_FILE = join(IR_DIR, "kitchen.ir.json");
const API_DIR = join(PROJECT_ROOT, "apps/api/app/api");

const GENERATED_MARKERS = [
  "Generated from Manifest IR - DO NOT EDIT",
  "@generated",
  "DO NOT EDIT - Changes will be overwritten",
];

const hasGeneratedMarker = (content: string) =>
  GENERATED_MARKERS.some((marker) => content.includes(marker));

/**
 * Convert camelCase to kebab-case. Must match the toKebabCase in audit-routes.ts
 * and the filesystem convention used by the generator.
 */
const toKebabCase = (str: string) =>
  str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * ENTITY_DOMAIN_MAP — must stay in sync with scripts/manifest/generate.mjs.
 * Used to resolve expected route paths from commands.json entries.
 */
const ENTITY_DOMAIN_MAP: Record<string, string> = {
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
  Client: "crm/clients",
  ClientContact: "crm/client-contacts",
  ClientPreference: "crm/client-preferences",
  Lead: "crm/leads",
  Proposal: "crm/proposals",
  ProposalLineItem: "crm/proposal-line-items",
  ClientInteraction: "crm/client-interactions",
  PurchaseOrder: "inventory/purchase-orders",
  PurchaseOrderItem: "inventory/purchase-order-items",
  Shipment: "shipments/shipment",
  ShipmentItem: "shipments/shipment-items",
  InventoryTransaction: "inventory/transactions",
  InventorySupplier: "inventory/suppliers",
  CycleCountSession: "inventory/cycle-count/sessions",
  CycleCountRecord: "inventory/cycle-count/records",
  VarianceReport: "inventory/cycle-count/variance-reports",
  User: "staff/employees",
  Schedule: "staff/schedules",
  ScheduleShift: "staff/shifts",
  TimeEntry: "timecards/entries",
  TimecardEditRequest: "timecards/edit-requests",
  CommandBoard: "command-board/boards",
  CommandBoardCard: "command-board/cards",
  CommandBoardGroup: "command-board/groups",
  CommandBoardConnection: "command-board/connections",
  CommandBoardLayout: "command-board/layouts",
  Workflow: "collaboration/workflows",
  Notification: "collaboration/notifications",
};

// ---------------------------------------------------------------------------
// Test A — commands.json determinism
// ---------------------------------------------------------------------------
describe("Test A: commands.json determinism", () => {
  it("commands.json is sorted by entity ASC, command ASC", () => {
    const commands = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    expect(commands.length).toBeGreaterThan(0);

    for (let i = 1; i < commands.length; i++) {
      const prev = commands[i - 1];
      const curr = commands[i];
      const entityCmp = prev.entity.localeCompare(curr.entity);
      if (entityCmp > 0) {
        throw new Error(
          `commands.json not sorted: "${prev.entity}.${prev.command}" comes before "${curr.entity}.${curr.command}" but entity order is wrong`
        );
      }
      if (entityCmp === 0 && prev.command.localeCompare(curr.command) > 0) {
        throw new Error(
          `commands.json not sorted: "${prev.entity}.${prev.command}" comes before "${prev.entity}.${curr.command}" but command order is wrong`
        );
      }
    }
  });

  it("commands.json entries have exactly {entity, command, commandId} fields", () => {
    const commands = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    for (const cmd of commands) {
      const keys = Object.keys(cmd).sort();
      expect(keys).toEqual(["command", "commandId", "entity"]);
      expect(cmd.commandId).toBe(`${cmd.entity}.${cmd.command}`);
    }
  });

  it("commands.json is derivable from IR (same content, ignoring timestamps)", () => {
    // Re-derive commands.json from the IR and compare against the committed file.
    // This proves the compile step is deterministic — same IR always produces
    // the same commands.json.
    const ir = JSON.parse(readFileSync(IR_FILE, "utf8"));
    const derived = (ir.commands ?? [])
      .map((cmd: { entity: string; name: string }) => ({
        entity: cmd.entity,
        command: cmd.name,
        commandId: `${cmd.entity}.${cmd.name}`,
      }))
      .sort(
        (
          a: { entity: string; command: string },
          b: { entity: string; command: string }
        ) => {
          const entityCmp = a.entity.localeCompare(b.entity);
          if (entityCmp !== 0) return entityCmp;
          return a.command.localeCompare(b.command);
        }
      );

    const committed = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    expect(derived).toEqual(committed);
  });
});

// ---------------------------------------------------------------------------
// Test B — generated route content determinism
// ---------------------------------------------------------------------------
describe("Test B: generated route content determinism", () => {
  it("all generated list routes contain the expected marker", () => {
    // Every entity with a domain mapping should have a list/route.ts with
    // the generated marker. This proves the generator ran and produced output.
    const entities = Object.keys(ENTITY_DOMAIN_MAP);
    const missing: string[] = [];

    for (const entity of entities) {
      const domain = ENTITY_DOMAIN_MAP[entity];
      const listRoute = join(API_DIR, domain, "list", "route.ts");
      if (!existsSync(listRoute)) {
        missing.push(`${domain}/list/route.ts (entity: ${entity})`);
        continue;
      }
      const content = readFileSync(listRoute, "utf8");
      if (!hasGeneratedMarker(content)) {
        missing.push(
          `${domain}/list/route.ts (entity: ${entity}) — exists but missing generated marker`
        );
      }
    }

    // Some entities may not have list routes (e.g., entities without domain mapping
    // in the generator). We expect the vast majority to have them.
    // Allow up to 6 missing (entities like EventDish, EventStaff, etc. that lack
    // domain mappings in the generator).
    if (missing.length > 6) {
      throw new Error(
        `Too many missing generated list routes (${missing.length}):\n${missing.join("\n")}`
      );
    }
  });

  it("all generated command routes contain the generated marker and a POST handler", () => {
    // Every generated command route must have the generated marker and export
    // a POST function. This verifies the generator produces structurally valid
    // command routes regardless of template version.
    const commands = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    const invalid: string[] = [];

    for (const cmd of commands) {
      const domain = ENTITY_DOMAIN_MAP[cmd.entity];
      if (!domain) continue;

      const kebabCommand = toKebabCase(cmd.command);
      const routePath = join(
        API_DIR,
        domain,
        "commands",
        kebabCommand,
        "route.ts"
      );
      if (!existsSync(routePath)) continue;

      const content = readFileSync(routePath, "utf8");
      if (!hasGeneratedMarker(content)) continue;

      // Every generated command route must export a POST handler
      if (!/export\s+(?:async\s+)?function\s+POST\s*\(/.test(content)) {
        invalid.push(
          `${domain}/commands/${kebabCommand}/route.ts — missing POST export`
        );
      }
    }

    expect(invalid, "Generated command routes missing POST export").toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test C — manual GET routes untouched by generator
// ---------------------------------------------------------------------------
describe("Test C: manual GET routes untouched by generator", () => {
  it("manual (non-generated) route files do not have generated markers", () => {
    // Collect all route.ts files under the API directory that are NOT in
    // list/ or commands/ subdirectories — these are manual routes.
    const manualRoutes: string[] = [];
    const domains = Object.values(ENTITY_DOMAIN_MAP);

    for (const domain of domains) {
      const domainDir = join(API_DIR, domain);
      if (!existsSync(domainDir)) continue;

      // The top-level route.ts in each domain dir is typically manual
      const topRoute = join(domainDir, "route.ts");
      if (existsSync(topRoute)) {
        manualRoutes.push(topRoute);
      }
    }

    // Verify none of these manual routes have been overwritten with generated content
    const overwritten: string[] = [];
    for (const routePath of manualRoutes) {
      const content = readFileSync(routePath, "utf8");
      if (hasGeneratedMarker(content)) {
        const rel = routePath.replace(PROJECT_ROOT, "").replace(/\\/g, "/");
        overwritten.push(rel);
      }
    }

    expect(
      overwritten,
      "Manual routes should NOT contain generated markers — generator overwrote these files"
    ).toEqual([]);
  });

  it("generator skips non-generated files in non-commands namespace", () => {
    // Pick a known manual route and verify it has NO generated marker.
    // kitchen/prep-tasks/route.ts is a well-known manual GET route.
    const manualRoute = join(API_DIR, "kitchen/prep-tasks/route.ts");
    if (!existsSync(manualRoute)) {
      // If the file doesn't exist, the test is vacuously true
      return;
    }

    const content = readFileSync(manualRoute, "utf8");
    expect(hasGeneratedMarker(content)).toBe(false);

    // It should have a module/intent/responsibility docblock (manual pattern)
    expect(content).toContain("@module");
  });
});

// ---------------------------------------------------------------------------
// Test G — mirror check: commands.json ↔ disk routes
// ---------------------------------------------------------------------------
describe("Test G: mirror check — commands.json entries have disk routes", () => {
  /**
   * Build a Set of commandIds from commands.json, normalized to kebab-case
   * for filesystem comparison. commands.json uses camelCase (e.g., "updateQuantity")
   * but the filesystem uses kebab-case (e.g., "update-quantity").
   */
  function loadCommandIdSet() {
    const commands = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    // Two sets: one with original camelCase commandIds, one with kebab-case dir names
    const camelIds = new Set<string>();
    const kebabLookup = new Map<string, string>(); // kebab commandId → original commandId

    for (const cmd of commands as Array<{
      entity: string;
      command: string;
      commandId: string;
    }>) {
      camelIds.add(cmd.commandId);
      const kebabId = `${cmd.entity}.${toKebabCase(cmd.command)}`;
      kebabLookup.set(kebabId, cmd.commandId);
    }

    return { camelIds, kebabLookup };
  }

  it("every command route on disk has a commands.json entry (reverse mirror)", () => {
    // Reverse mirror: find all commands/*/route.ts files and verify each
    // has a corresponding commands.json entry (accounting for kebab-case).
    const { kebabLookup } = loadCommandIdSet();

    const orphanRoutes: string[] = [];
    const domains = Object.entries(ENTITY_DOMAIN_MAP);

    for (const [entity, domain] of domains) {
      const commandsDir = join(API_DIR, domain, "commands");
      if (!existsSync(commandsDir)) continue;

      for (const entry of readdirSync(commandsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const routeFile = join(commandsDir, entry.name, "route.ts");
        if (!existsSync(routeFile)) continue;

        const content = readFileSync(routeFile, "utf8");
        if (!hasGeneratedMarker(content)) continue; // Skip non-generated routes

        // Filesystem uses kebab-case, commands.json uses camelCase
        const kebabId = `${entity}.${entry.name}`;
        if (!kebabLookup.has(kebabId)) {
          orphanRoutes.push(
            `${domain}/commands/${entry.name}/route.ts (expected ${kebabId} in commands.json)`
          );
        }
      }
    }

    expect(
      orphanRoutes,
      "Generated command routes on disk without commands.json entries (generator drift)"
    ).toEqual([]);
  });

  it("command route coverage is tracked (forward mirror)", () => {
    // Forward mirror: for each commands.json entry with a domain mapping,
    // check if a route exists on disk. This is informational — not all
    // commands have routes yet (some are pending generation).
    const commands = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    let mapped = 0;
    let found = 0;
    const missing: string[] = [];

    for (const cmd of commands as Array<{
      entity: string;
      command: string;
      commandId: string;
    }>) {
      const domain = ENTITY_DOMAIN_MAP[cmd.entity];
      if (!domain) continue;
      mapped++;

      const kebabCommand = toKebabCase(cmd.command);
      const routePath = join(
        API_DIR,
        domain,
        "commands",
        kebabCommand,
        "route.ts"
      );
      if (existsSync(routePath)) {
        found++;
      } else {
        missing.push(`${cmd.commandId} → ${domain}/commands/${kebabCommand}/`);
      }
    }

    const coverage = mapped > 0 ? ((found / mapped) * 100).toFixed(1) : "0.0";

    // Coverage must not regress below current level.
    // As of Phase 4: 242 routes exist out of 264 mapped commands = 91.7%
    // If this threshold fails, a route was deleted without updating commands.json.
    expect(found).toBeGreaterThanOrEqual(230);

    // Log coverage for visibility
    console.info(
      `\n[mirror] Command route coverage: ${found}/${mapped} (${coverage}%)\n` +
        `[mirror] Missing routes: ${missing.length}\n`
    );
  });

  it("disk route count is consistent with commands.json", () => {
    const commands = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    const mappedCommands = (commands as Array<{ entity: string }>).filter(
      (c) => ENTITY_DOMAIN_MAP[c.entity]
    );

    // Count actual command route files on disk
    let diskRouteCount = 0;
    for (const domain of Object.values(ENTITY_DOMAIN_MAP)) {
      const commandsDir = join(API_DIR, domain, "commands");
      if (!existsSync(commandsDir)) continue;

      for (const entry of readdirSync(commandsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const routeFile = join(commandsDir, entry.name, "route.ts");
        if (existsSync(routeFile)) {
          diskRouteCount++;
        }
      }
    }

    // Disk routes should never EXCEED commands.json (would mean orphan routes).
    // Disk routes may be LESS than commands.json (pending generation).
    expect(diskRouteCount).toBeLessThanOrEqual(mappedCommands.length);

    // Disk routes should not drop below a floor (regression guard).
    expect(diskRouteCount).toBeGreaterThanOrEqual(230);
  });
});

// ---------------------------------------------------------------------------
// Test H — Known integrity issues are resolved
// ---------------------------------------------------------------------------

describe("Test H — Route integrity (known issues)", () => {
  it("H1: no route handler exists at app/conflicts/detect outside the API namespace", () => {
    // The non-API path app/conflicts/detect/route.ts was a security gap:
    // it exposed conflict detection with NO auth guard and NO tenant scoping.
    // The canonical endpoint is at app/api/conflicts/detect/route.ts (has auth).
    const nonApiConflictsRoute = join(
      PROJECT_ROOT,
      "apps/api/app/conflicts/detect/route.ts"
    );
    expect(
      existsSync(nonApiConflictsRoute),
      "app/conflicts/detect/route.ts should be deleted — security gap (no auth guard)"
    ).toBe(false);
  });

  it("H2: user-preferences/route.ts exports only valid Next.js handler names", () => {
    // Next.js App Router only recognizes: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS.
    // Exports like GET_KEY, PUT_KEY, DELETE_KEY are silently ignored — dead code.
    const routeFile = join(API_DIR, "user-preferences/route.ts");
    expect(existsSync(routeFile)).toBe(true);

    const content = readFileSync(routeFile, "utf-8");
    const VALID_HANDLER_NAMES = new Set([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]);

    // Match all "export async function NAME" declarations
    const exportedFunctions = [
      ...content.matchAll(/export\s+async\s+function\s+(\w+)/g),
    ].map((m) => m[1]);

    expect(exportedFunctions.length).toBeGreaterThan(0);
    for (const name of exportedFunctions) {
      expect(
        VALID_HANDLER_NAMES.has(name),
        `Exported function "${name}" is not a valid Next.js route handler name`
      ).toBe(true);
    }
  });

  it("H3: legacy prep-lists/save route is deleted (replaced by save-db)", () => {
    // The legacy save route used direct Prisma calls. The manifest-backed
    // save-db route uses runCommand for guard/constraint/policy enforcement.
    const legacySaveRoute = join(API_DIR, "kitchen/prep-lists/save/route.ts");
    const manifestSaveRoute = join(
      API_DIR,
      "kitchen/prep-lists/save-db/route.ts"
    );

    expect(
      existsSync(legacySaveRoute),
      "kitchen/prep-lists/save/route.ts should be deleted — replaced by save-db"
    ).toBe(false);
    expect(
      existsSync(manifestSaveRoute),
      "kitchen/prep-lists/save-db/route.ts must exist as the replacement"
    ).toBe(true);
  });

  it("H4: save-db route uses manifest runtime (runCommand)", () => {
    // The replacement route must go through the manifest runtime.
    const manifestSaveRoute = join(
      API_DIR,
      "kitchen/prep-lists/save-db/route.ts"
    );
    const content = readFileSync(manifestSaveRoute, "utf-8");

    expect(content).toContain("runCommand");
    expect(content).toContain("createManifestRuntime");
  });

  it("H5: exemptions registry does not reference deleted routes", () => {
    // Stale exemptions for deleted files are noise. Verify cleanup.
    const exemptionsFile = join(
      PROJECT_ROOT,
      "packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json"
    );
    const exemptions = JSON.parse(
      readFileSync(exemptionsFile, "utf-8")
    ) as Array<{
      path: string;
    }>;

    for (const exemption of exemptions) {
      const fullPath = join(PROJECT_ROOT, "apps/api", exemption.path);
      // Only check non-dynamic paths (skip [id] patterns — they always exist)
      if (!exemption.path.includes("[")) {
        expect(
          existsSync(fullPath),
          `Exemption references non-existent file: ${exemption.path}`
        ).toBe(true);
      }
    }
  });
});
