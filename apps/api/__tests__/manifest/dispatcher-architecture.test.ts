/**
 * Manifest Command Dispatcher — Architecture Contract Tests
 *
 * Validates the architectural rule: ALL command writes MUST route through
 * a single dynamic dispatcher at `app/api/manifest/[entity]/commands/[command]/route.ts`.
 * Per-command concrete route files are architecturally illegal unless listed
 * in `apps/api/lib/manifest/custom-command-routes-allowlist.ts`.
 *
 * @see manifest/ir/kitchen.commands.json
 * @see packages/manifest-runtime/packages/cli/src/commands/audit-routes.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CUSTOM_COMMAND_ROUTE_ALLOWLIST,
  isCustomCommandRoute,
} from "@/lib/manifest/custom-command-routes-allowlist";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../../..");
const API_DIR = resolve(PROJECT_ROOT, "apps/api/app/api");
const COMMANDS_JSON = resolve(
  PROJECT_ROOT,
  "manifest/ir/kitchen.commands.json"
);
const DISPATCHER = resolve(
  PROJECT_ROOT,
  "apps/api/app/api/manifest/[entity]/commands/[command]/route.ts"
);

// ── Helpers ──

interface CommandEntry {
  command: string;
  entity: string;
  params?: unknown[];
}

let _commandsCache: CommandEntry[] | null = null;

function loadCommands(): CommandEntry[] {
  if (!_commandsCache) {
    _commandsCache = JSON.parse(readFileSync(COMMANDS_JSON, "utf-8"));
  }
  return _commandsCache!;
}

function getEntities(): string[] {
  const seen = new Set<string>();
  for (const c of loadCommands()) {
    seen.add(c.entity);
  }
  const result: string[] = [];
  seen.forEach((e) => result.push(e));
  return result;
}

function getCommandsForEntity(entity: string): CommandEntry[] {
  return loadCommands().filter((c) => c.entity === entity);
}

function findConcreteCommandRoutes(): string[] {
  const routes: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry !== "route.ts") {
        continue;
      }
      const relativePath = relative(API_DIR, fullPath).replace(/\\/g, "/");
      if (!relativePath.includes("/commands/")) {
        continue;
      }
      if (relativePath.includes("[command]/route.ts")) {
        continue;
      }
      routes.push(relativePath);
    }
  }

  walk(API_DIR);
  return routes;
}

// ── Tests ──

describe("Manifest Command Registry (kitchen.commands.json)", () => {
  it("is present and parseable", () => {
    expect(loadCommands().length).toBeGreaterThan(500);
  });

  it("every entry has entity and command", () => {
    for (const entry of loadCommands()) {
      expect(entry.entity).toBeTruthy();
      expect(entry.command).toBeTruthy();
    }
  });

  it("every entity has at least one command", () => {
    for (const entity of getEntities()) {
      expect(getCommandsForEntity(entity).length).toBeGreaterThan(0);
    }
  });

  describe("dispatcher-required entity coverage", () => {
    const expectedEntities = [
      "Facility",
      "FacilityArea",
      "FacilityAsset",
      "FacilitySchedule",
      "FacilityWorkOrder",
      "Driver",
      "Vehicle",
      "LogisticsRoute",
      "LogisticsDispatch",
      "KnowledgeBaseEntry",
      "DocumentVersion",
      "AutomatedFollowup",
      "EventTimelineItem",
      "EventWaitlistEntry",
      "QACheck",
      "QACorrectiveAction",
      "QATemperatureLog",
      "InventoryTransfer",
      "BankAccount",
      "Budget",
      "Vendor",
      "StaffPerformance",
      "Deal",
      "Equipment",
    ];

    for (const entity of expectedEntities) {
      it(entity, () => {
        expect(getCommandsForEntity(entity).length).toBeGreaterThan(0);
      });
    }
  });

  describe("command-rename verification", () => {
    it("never uses delete as command name", () => {
      for (const c of loadCommands()) {
        expect(c.command).not.toBe("delete");
      }
    });

    it("KnowledgeBaseEntry uses publishEntry not publish", () => {
      const cmdNames = getCommandsForEntity("KnowledgeBaseEntry").map(
        (c) => c.command
      );
      expect(cmdNames).toContain("publishEntry");
      expect(cmdNames).not.toContain("publish");
    });

    it("StaffPerformance has remove command", () => {
      const cmdNames = getCommandsForEntity("StaffPerformance").map(
        (c) => c.command
      );
      expect(cmdNames).toContain("remove");
    });

    it("Deal has close command", () => {
      const cmdNames = getCommandsForEntity("Deal").map((c) => c.command);
      expect(cmdNames).toContain("close");
    });
  });
});

describe("Dynamic Dispatcher Route", () => {
  it("exists at the canonical path", () => {
    expect(readFileSync(DISPATCHER, "utf-8")).toBeTruthy();
  });

  it("imports runManifestCommand from execute-command", () => {
    const content = readFileSync(DISPATCHER, "utf-8");
    expect(content).toMatch(/runManifestCommand/);
    expect(content).toMatch(/execute-command/);
  });

  it("does not import or call createManifestRuntime directly", () => {
    const content = readFileSync(DISPATCHER, "utf-8");
    expect(content).not.toMatch(/createManifestRuntime/);
    expect(content).not.toMatch(/runtime\.runCommand/);
    expect(content).not.toMatch(/resolveCommand/);
  });

  it("delegates execution to runManifestCommand with route params", () => {
    const content = readFileSync(DISPATCHER, "utf-8");
    expect(content).toMatch(/requireCurrentUser/);
    expect(content).toMatch(/runManifestCommand\s*\(/);
    expect(content).toMatch(/entity,/);
    expect(content).toMatch(/command:\s*commandSlug/);
  });

  it("exports only POST", () => {
    const content = readFileSync(DISPATCHER, "utf-8");
    expect(content).toMatch(/export\s+async\s+function\s+POST/);
    expect(content).not.toMatch(/export\s+async\s+function\s+GET/);
    expect(content).not.toMatch(/export\s+async\s+function\s+DELETE/);
  });
});

describe("execute-command wrapper", () => {
  it("delegates to runManifestCommandCore with API runtime factory", () => {
    const executeCommandPath = resolve(
      PROJECT_ROOT,
      "apps/api/lib/manifest/execute-command.ts"
    );
    const content = readFileSync(executeCommandPath, "utf-8");
    expect(content).toMatch(/runManifestCommandCore/);
    expect(content).toMatch(/createManifestRuntime/);
    expect(content).toMatch(/manifestErrorResponse/);
    expect(content).toMatch(/manifestSuccessResponse/);
  });
});

describe("Concrete Command Route Prohibition", () => {
  it("allowlists only routes with documented custom behavior", () => {
    for (const route of CUSTOM_COMMAND_ROUTE_ALLOWLIST) {
      expect(isCustomCommandRoute(route)).toBe(true);
    }
  });

  it("has no thin wrapper routes outside the dispatcher", () => {
    const routes = findConcreteCommandRoutes();
    const illegal = routes.filter((route) => !isCustomCommandRoute(route));

    if (illegal.length > 0) {
      console.warn(
        `[FAIL] Thin command wrapper routes must be removed:\n${illegal.map((r) => `  - ${r}`).join("\n")}`
      );
    }

    expect(illegal).toEqual([]);
  });

  it("documents every remaining non-dispatcher command route", () => {
    const routes = findConcreteCommandRoutes();
    const undocumented = routes.filter((route) => !isCustomCommandRoute(route));
    expect(undocumented).toEqual([]);
    expect(routes.sort()).toEqual([...CUSTOM_COMMAND_ROUTE_ALLOWLIST].sort());
  });
});
