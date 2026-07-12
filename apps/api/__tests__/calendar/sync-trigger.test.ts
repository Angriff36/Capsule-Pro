/**
 * Calendar sync trigger — N+1 batch-preload regression guard.
 *
 * `syncGoogleCalendar` + `syncOutlookCalendar` previously issued one
 * `event.findFirst` per external event (up to 250 sequential round-trips per
 * sync). They now preload existing external events once into a Map and do an
 * in-memory lookup. These tests pin that collapse: the per-event `findFirst`
 * must NEVER fire, the preload `findMany` fires exactly once, and dedup
 * (update vs create) is decided by the (title, eventDate, eventType) key.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEventFindMany = vi.fn();
const mockEventFindFirst = vi.fn();
const mockProviderSyncFindFirst = vi.fn();
const mockProviderSyncUpdate = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    event: {
      findMany: (...args: unknown[]) => mockEventFindMany(...args),
      findFirst: (...args: unknown[]) => mockEventFindFirst(...args),
    },
    providerSync: {
      findFirst: (...args: unknown[]) => mockProviderSyncFindFirst(...args),
      update: (...args: unknown[]) => mockProviderSyncUpdate(...args),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, resolveCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { runManifestCommandCore } = await import(
  "@repo/manifest-runtime/run-manifest-command-core"
);
const { POST } = await import("@/app/api/calendar/sync/trigger/route");

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000020";
const TEST_USER_ID = "user_calendar_sync";
const TEST_ORG_ID = "org_calendar_sync";

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(resolveCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
  } as never);
  mockProviderSyncFindFirst.mockResolvedValue({
    id: "sync-1",
    accessToken: "token-abc",
    calendarId: "primary",
    // Valid (tomorrow) so the expiry guard does not reject.
    tokenExpiry: new Date(Date.now() + 86_400_000).toISOString(),
  });
  mockProviderSyncUpdate.mockResolvedValue({});
  vi.mocked(runManifestCommandCore).mockResolvedValue({
    ok: true,
    result: { id: "created" },
  } as never);
}

function mockFetchEvents(events: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => events,
      text: async () => "",
    })
  );
}

/** Extract the 2nd arg (the `{entity,command,body,user,instanceId}` params)
 * from each `runManifestCommandCore` call. */
function commandSequence(): { command?: string; instanceId?: string }[] {
  return vi.mocked(runManifestCommandCore).mock.calls.map((c) => c[1]) as {
    command?: string;
    instanceId?: string;
  }[];
}

function buildRequest(provider: string) {
  return new NextRequest("http://localhost/api/calendar/sync/trigger", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  makeAuthed();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------

describe("POST /api/calendar/sync/trigger — N+1 batch preload", () => {
  it("google: preloads existing events once and never calls findFirst", async () => {
    mockFetchEvents({
      items: [
        {
          id: "g1",
          summary: "Event One",
          start: { dateTime: "2026-08-10T10:00:00Z" },
        },
        {
          id: "g2",
          summary: "Event Two",
          start: { dateTime: "2026-08-15T10:00:00Z" },
        },
        {
          id: "g3",
          summary: "Event Three",
          start: { dateTime: "2026-08-20T10:00:00Z" },
        },
      ],
    });
    // "Event Two" already exists in-db (matching key).
    mockEventFindMany.mockResolvedValue([
      {
        id: "evt-two",
        title: "Event Two",
        eventDate: new Date("2026-08-15T10:00:00.000Z"),
        eventType: "external_google",
      },
    ]);

    const res = await POST(buildRequest("google"));
    const json = await res.json();

    // Regression guard: N+1 collapsed — ONE preload, ZERO per-event findFirst.
    expect(mockEventFindMany).toHaveBeenCalledTimes(1);
    expect(mockEventFindFirst).not.toHaveBeenCalled();

    // Behavior parity: all three imported; Event Two updated, others created.
    expect(json.success).toBe(true);
    expect(json.imported).toBe(3);
    const cmds = commandSequence();
    expect(cmds).toHaveLength(3);
    expect(cmds[0]?.command).toBe("create");
    expect(cmds[1]?.command).toBe("update");
    expect(cmds[1]?.instanceId).toBe("evt-two");
    expect(cmds[2]?.command).toBe("create");
  });

  it("outlook: preloads existing events once and never calls findFirst", async () => {
    mockFetchEvents({
      value: [
        {
          id: "o1",
          subject: "Meet A",
          start: { dateTime: "2026-08-10T10:00:00Z" },
        },
        {
          id: "o2",
          subject: "Meet B",
          start: { dateTime: "2026-08-15T10:00:00Z" },
        },
      ],
    });
    mockEventFindMany.mockResolvedValue([
      {
        id: "evt-b",
        title: "Meet B",
        eventDate: new Date("2026-08-15T10:00:00.000Z"),
        eventType: "external_outlook",
      },
    ]);

    const res = await POST(buildRequest("outlook"));
    const json = await res.json();

    expect(mockEventFindMany).toHaveBeenCalledTimes(1);
    expect(mockEventFindFirst).not.toHaveBeenCalled();
    expect(json.imported).toBe(2);
    const cmds = commandSequence();
    expect(cmds[0]?.command).toBe("create");
    expect(cmds[1]?.command).toBe("update");
    expect(cmds[1]?.instanceId).toBe("evt-b");
  });

  it("same title/type but different date does not match (key parity)", async () => {
    // Existing row has a different eventDate → key differs → must CREATE.
    mockFetchEvents({
      items: [
        {
          id: "g9",
          summary: "Rescheduled",
          start: { dateTime: "2026-09-01T10:00:00Z" },
        },
      ],
    });
    mockEventFindMany.mockResolvedValue([
      {
        id: "evt-old",
        title: "Rescheduled",
        eventDate: new Date("2026-08-01T10:00:00.000Z"),
        eventType: "external_google",
      },
    ]);

    await POST(buildRequest("google"));

    const cmds = commandSequence();
    expect(cmds).toHaveLength(1);
    expect(cmds[0]?.command).toBe("create"); // different date → no match
  });
});
