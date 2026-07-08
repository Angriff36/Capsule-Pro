/**
 * @vitest-environment node
 *
 * Regression: setupEventCompletely must confirm the event through the governed
 * Event.confirm path (reaction → PrepList.create → seed middleware), not raw
 * SQL into prep_lists. Also pins the events.title column fix (not name).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(async () => ({ orgId: "org-1" })),
}));

const tenantMocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  getTenantIdForOrg: vi.fn(async () => "tenant-1"),
}));

vi.mock("@/app/lib/tenant", () => tenantMocks);
vi.mock("../../app/lib/tenant", () => tenantMocks);

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import { setupEventCompletely } from "../../app/(authenticated)/(events)/events/actions/setup-event-completely";

const queryRaw = database.$queryRaw as ReturnType<typeof vi.fn>;
const executeRaw = database.$executeRaw as ReturnType<typeof vi.fn>;
const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = tenantMocks.requireCurrentUser;

const EVENT_ID = "event-11111111-1111-1111-1111-111111111111";
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const PREP_LIST_ID = "preplist-22222222-2222-2222-2222-222222222222";
const AUTO_SEED_MARKER = "[auto-seed:event-confirmed]";

const EVENT_ROW = {
  id: EVENT_ID,
  title: "Spring Gala",
  client_id: "client-1",
  venue_name: "Grand Hall",
  venue_entity_id: null,
  event_date: new Date("2026-08-01"),
};

function sqlText(parts: TemplateStringsArray | readonly string[]): string {
  return Array.isArray(parts) ? parts.join(" ") : String(parts);
}

function mockHappyPathQueries(prepListItemCount = 2) {
  let queryIndex = 0;
  queryRaw.mockImplementation((parts: TemplateStringsArray) => {
    const sql = sqlText(parts);
    queryIndex++;

    if (sql.includes("SELECT id, title")) {
      return Promise.resolve([EVENT_ROW]);
    }
    if (sql.includes("FROM tenant_events.event_dishes")) {
      return Promise.resolve([{ cnt: 1n }]);
    }
    if (sql.includes("FROM tenant_events.event_staff")) {
      return Promise.resolve([{ cnt: 1n }]);
    }
    if (sql.includes("SELECT COUNT(*) as cnt") && sql.includes("prep_lists")) {
      return Promise.resolve([{ cnt: 0n }]);
    }
    if (sql.includes("SELECT status FROM tenant_events.events")) {
      return Promise.resolve([{ status: "draft" }]);
    }
    if (sql.includes("FROM tenant_kitchen.prep_lists pl")) {
      return Promise.resolve([
        {
          id: PREP_LIST_ID,
          notes: `${AUTO_SEED_MARKER} 2 items from 1 dish(es)`,
          item_cnt: BigInt(prepListItemCount),
        },
      ]);
    }
    if (sql.includes("FROM tenant_events.event_contracts")) {
      return Promise.resolve([{ cnt: 0n }]);
    }
    if (sql.includes("FROM tenant_events.event_budgets")) {
      return Promise.resolve([{ cnt: 0n }]);
    }

    throw new Error(`Unexpected $queryRaw at index ${queryIndex}: ${sql}`);
  });
}

describe("setupEventCompletely — governed prep list via Event.confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "manager",
    });
    runCommand.mockResolvedValue({ ok: true });
    executeRaw.mockResolvedValue(1);
    mockHappyPathQueries();
  });

  it("does not contain a raw INSERT into prep_lists", () => {
    const sourcePath = path.join(
      import.meta.dirname,
      "../../app/(authenticated)/(events)/events/actions/setup-event-completely.ts"
    );
    const source = readFileSync(sourcePath, "utf8");
    expect(source).not.toMatch(/INSERT\s+INTO\s+tenant_kitchen\.prep_lists/i);
    expect(source).not.toMatch(/\bevent\.name\b/);
    expect(source).toContain("SELECT id, title");
  });

  it("calls Event.confirm exactly once and completes contract + budget steps", async () => {
    const result = await setupEventCompletely(EVENT_ID);

    const confirmCalls = runCommand.mock.calls.filter(
      ([args]) => args.entity === "Event" && args.command === "confirm"
    );
    expect(confirmCalls).toHaveLength(1);
    expect(confirmCalls[0]?.[0]).toMatchObject({
      entity: "Event",
      command: "confirm",
      instanceId: EVENT_ID,
      body: { id: EVENT_ID, userId: USER_ID },
    });

    expect(result.eventName).toBe("Spring Gala");
    expect(result.steps.prepListGenerated).toMatchObject({
      completed: true,
      skipped: false,
    });
    expect(result.steps.prepListGenerated.detail).toContain(
      "Prep list seeded via Event.confirm"
    );
    expect(result.steps.contractCreated.completed).toBe(true);
    expect(result.steps.budgetCreated.completed).toBe(true);

    const executeSql = executeRaw.mock.calls.map(([parts]) => sqlText(parts));
    expect(
      executeSql.some((sql) => /INSERT\s+INTO\s+tenant_kitchen\.prep_lists/i.test(sql))
    ).toBe(false);
    expect(
      executeSql.some((sql) =>
        /INSERT\s+INTO\s+tenant_events\.event_contracts/i.test(sql)
      )
    ).toBe(true);
    expect(
      executeSql.some((sql) =>
        /INSERT\s+INTO\s+tenant_events\.event_budgets/i.test(sql)
      )
    ).toBe(true);
  });

  it("skips Event.confirm when a prep list already exists", async () => {
    queryRaw.mockImplementation((parts: TemplateStringsArray) => {
      const sql = sqlText(parts);
      if (sql.includes("SELECT id, title")) {
        return Promise.resolve([EVENT_ROW]);
      }
      if (sql.includes("FROM tenant_events.event_dishes")) {
        return Promise.resolve([{ cnt: 1n }]);
      }
      if (sql.includes("FROM tenant_events.event_staff")) {
        return Promise.resolve([{ cnt: 1n }]);
      }
      if (sql.includes("SELECT COUNT(*) as cnt") && sql.includes("prep_lists")) {
        return Promise.resolve([{ cnt: 1n }]);
      }
      if (sql.includes("FROM tenant_events.event_contracts")) {
        return Promise.resolve([{ cnt: 1n }]);
      }
      if (sql.includes("FROM tenant_events.event_budgets")) {
        return Promise.resolve([{ cnt: 1n }]);
      }
      return Promise.resolve([]);
    });

    const result = await setupEventCompletely(EVENT_ID);

    expect(runCommand).not.toHaveBeenCalled();
    expect(result.steps.prepListGenerated).toMatchObject({
      completed: true,
      skipped: true,
      detail: "Prep list already exists",
    });
  });

  it("requires the auto-seed marker and seeded items on the governed prep list", async () => {
    mockHappyPathQueries(3);

    const result = await setupEventCompletely(EVENT_ID);

    expect(result.steps.prepListGenerated.detail).toContain("3 item(s)");
    expect(runCommand).toHaveBeenCalledTimes(1);
  });
});
