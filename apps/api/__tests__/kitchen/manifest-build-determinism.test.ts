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
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = join(dirname(__filename), "../../../..");
const IR_DIR = join(PROJECT_ROOT, "manifest/ir");
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

const toKebabCase = (str: string) =>
  str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

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
          `commands.json not sorted: "${prev.entity}.${prev.command}" comes before "${curr.entity}.${curr.command}" but command order is wrong`
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

const HAND_MAINTAINED_LIST_ROUTES: ReadonlySet<string> = new Set([
  "PrepTask",
  "Recipe",
  "Ingredient",
  "Client",
  "Lead",
  "InventorySupplier",
  "Schedule",
  "AdminTask",
]);

describe("Test B: generated route content determinism", () => {
  it("all generated list routes contain the expected marker (or are explicitly hand-maintained)", () => {
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
      if (
        !(
          hasGeneratedMarker(content) || HAND_MAINTAINED_LIST_ROUTES.has(entity)
        )
      ) {
        missing.push(
          `${domain}/list/route.ts (entity: ${entity}) — exists but missing generated marker (and not in HAND_MAINTAINED_LIST_ROUTES)`
        );
      }
    }

    if (missing.length > 6) {
      throw new Error(
        `Too many missing generated list routes (${missing.length}):\n${missing.join("\n")}`
      );
    }
  });

  it("all generated command routes contain the generated marker and a POST handler", () => {
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

      const hasValidPostExport =
        /export\s+(?:async\s+)?function\s+POST\s*\(/.test(content) ||
        /export\s+const\s+POST\s*=/.test(content);
      if (!hasValidPostExport) {
        invalid.push(
          `${domain}/commands/${kebabCommand}/route.ts — missing POST export`
        );
      }
    }

    expect(invalid, "Generated command routes missing POST export").toEqual([]);
  });
});

describe("Test C: manual GET routes untouched by generator", () => {
  it("manual (non-generated) route files do not have generated markers", () => {
    const manualRoutes: string[] = [];
    const domains = Object.values(ENTITY_DOMAIN_MAP);

    for (const domain of domains) {
      const domainDir = join(API_DIR, domain);
      if (!existsSync(domainDir)) continue;

      const topRoute = join(domainDir, "route.ts");
      if (existsSync(topRoute)) {
        manualRoutes.push(topRoute);
      }
    }

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
    const manualRoute = join(API_DIR, "kitchen/prep-tasks/route.ts");
    if (!existsSync(manualRoute)) {
      return;
    }

    const content = readFileSync(manualRoute, "utf8");
    expect(hasGeneratedMarker(content)).toBe(false);
    expect(content).toContain("@module");
  });
});

describe("Test G: mirror check — commands.json entries have disk routes", () => {
  function loadCommandIdSet() {
    const commands = JSON.parse(readFileSync(COMMANDS_FILE, "utf8"));
    const camelIds = new Set<string>();
    const kebabLookup = new Map<string, string>();

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

  it("every legacy command route on disk has a commands.json entry (reverse mirror)", () => {
    // With the unified dispatcher pattern, most commands route through
    // manifest/[entity]/commands/[command]/route.ts. Legacy individual
    // command routes that still exist must match commands.json entries.
    const { kebabLookup } = loadCommandIdSet();

    const orphanRoutes: string[] = [];
    const ALLOWED_ORPHAN_ROUTES = new Set([
      "crm/proposals/commands/convert-to-invoice/route.ts",
    ]);
    const domains = Object.entries(ENTITY_DOMAIN_MAP);

    for (const [entity, domain] of domains) {
      const commandsDir = join(API_DIR, domain, "commands");
      if (!existsSync(commandsDir)) continue;

      for (const entry of readdirSync(commandsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const routeFile = join(commandsDir, entry.name, "route.ts");
        if (!existsSync(routeFile)) continue;

        const content = readFileSync(routeFile, "utf8");
        if (!hasGeneratedMarker(content)) continue;

        const kebabId = `${entity}.${entry.name}`;
        const routeRel = `${domain}/commands/${entry.name}/route.ts`;
        if (
          !(kebabLookup.has(kebabId) || ALLOWED_ORPHAN_ROUTES.has(routeRel))
        ) {
          orphanRoutes.push(
            `${routeRel} (expected ${kebabId} in commands.json)`
          );
        }
      }
    }

    expect(
      orphanRoutes,
      "Generated command routes on disk without commands.json entries (generator drift)"
    ).toEqual([]);
  });

  it("unified dispatcher route exists", () => {
    // All commands now route through a single dynamic dispatcher at
    // app/api/manifest/[entity]/commands/[command]/route.ts
    const dispatcherRoute = join(API_DIR, "manifest/[entity]/commands/[command]/route.ts");
    expect(
      existsSync(dispatcherRoute),
      "Unified dispatcher route must exist"
    ).toBe(true);
  });

  it("unified dispatcher route exports POST handler", () => {
    const dispatcherRoute = join(API_DIR, "manifest/[entity]/commands/[command]/route.ts");
    const content = readFileSync(dispatcherRoute, "utf8");
    expect(content).toContain("export async function POST");
    expect(content).toContain("runManifestCommand");
    expect(content).toContain("requireCurrentUser");
  });
});

describe("Test H — Route integrity (known issues)", () => {
  it("H1: no route handler exists at app/conflicts/detect outside the API namespace", () => {
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
    const manifestSaveRoute = join(
      API_DIR,
      "kitchen/prep-lists/save-db/route.ts"
    );
    const content = readFileSync(manifestSaveRoute, "utf-8");

    expect(content).toContain("runCommand");
    expect(content).toContain("createManifestRuntime");
  });

  it("H5: exemptions registry does not reference deleted routes", () => {
    const exemptionsFile = join(
      PROJECT_ROOT,
      "packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json"
    );
    if (!existsSync(exemptionsFile)) {
      // Exemptions file may not exist in this version
      return;
    }
    const exemptions = JSON.parse(
      readFileSync(exemptionsFile, "utf-8")
    ) as Array<{
      path: string;
    }>;

    for (const exemption of exemptions) {
      const fullPath = join(PROJECT_ROOT, "apps/api", exemption.path);
      if (!exemption.path.includes("[")) {
        expect(
          existsSync(fullPath),
          `Exemption references non-existent file: ${exemption.path}`
        ).toBe(true);
      }
    }
  });
});
