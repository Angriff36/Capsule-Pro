/**
 * Tests for route-resolution.ts — matchRoute logic.
 *
 * Tests the invariant: "URL paths are correctly matched to route definitions
 * with path parameter extraction."
 *
 * Since matchRoute is not exported, we replicate the algorithm for testing.
 * This tests the ALGORITHM, not the module integration.
 */

import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Replicate matchRoute (not exported from route-resolution.ts)
// ---------------------------------------------------------------------------

interface RouteEntry {
  id: string;
  path: string;
  method: string;
  params: Array<{ name: string; type: string; location: string }>;
  source: {
    kind: "entity-read" | "command";
    entity?: string;
    command?: string;
  };
  auth: boolean;
  tenant: boolean;
}

function matchRoute(
  routes: RouteEntry[],
  url: string,
  method: string
): (RouteEntry & { extractedParams: Record<string, string> }) | null {
  const urlPath = url.split("?")[0].startsWith("/")
    ? url.split("?")[0]
    : `/${url.split("?")[0]}`;

  for (const route of routes) {
    if (route.method !== method) continue;

    const paramNames: string[] = [];
    const pattern = route.path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });

    const regex = new RegExp(`^${pattern}$`);
    const match = urlPath.match(regex);

    if (match) {
      const extractedParams: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        extractedParams[name] = match[i + 1];
      });

      return { ...route, extractedParams };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SAMPLE_ROUTES: RouteEntry[] = [
  {
    id: "preptask-list",
    path: "/api/kitchen/prep-tasks",
    method: "GET",
    params: [],
    source: { kind: "entity-read", entity: "PrepTask" },
    auth: true,
    tenant: true,
  },
  {
    id: "preptask-get",
    path: "/api/kitchen/prep-tasks/:id",
    method: "GET",
    params: [{ name: "id", type: "string", location: "path" }],
    source: { kind: "entity-read", entity: "PrepTask" },
    auth: true,
    tenant: true,
  },
  {
    id: "preptask-claim",
    path: "/api/kitchen/prep-tasks/:id/claim",
    method: "POST",
    params: [{ name: "id", type: "string", location: "path" }],
    source: { kind: "command", entity: "PrepTask", command: "claim" },
    auth: true,
    tenant: true,
  },
  {
    id: "event-get",
    path: "/api/events/:eventId",
    method: "GET",
    params: [{ name: "eventId", type: "string", location: "path" }],
    source: { kind: "entity-read", entity: "Event" },
    auth: true,
    tenant: true,
  },
  {
    id: "event-staff-assign",
    path: "/api/events/:eventId/staff/:staffId",
    method: "PUT",
    params: [
      { name: "eventId", type: "string", location: "path" },
      { name: "staffId", type: "string", location: "path" },
    ],
    source: { kind: "command", entity: "EventStaff", command: "assign" },
    auth: true,
    tenant: true,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("matchRoute", () => {
  it("matches a static route", () => {
    const result = matchRoute(SAMPLE_ROUTES, "/api/kitchen/prep-tasks", "GET");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("preptask-list");
    expect(result!.extractedParams).toEqual({});
  });

  it("matches a route with one path parameter", () => {
    const result = matchRoute(
      SAMPLE_ROUTES,
      "/api/kitchen/prep-tasks/abc-123",
      "GET"
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("preptask-get");
    expect(result!.extractedParams).toEqual({ id: "abc-123" });
  });

  it("matches a route with path param and trailing segment", () => {
    const result = matchRoute(
      SAMPLE_ROUTES,
      "/api/kitchen/prep-tasks/abc-123/claim",
      "POST"
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("preptask-claim");
    expect(result!.extractedParams).toEqual({ id: "abc-123" });
  });

  it("matches a route with multiple path parameters", () => {
    const result = matchRoute(
      SAMPLE_ROUTES,
      "/api/events/evt-1/staff/staff-2",
      "PUT"
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("event-staff-assign");
    expect(result!.extractedParams).toEqual({
      eventId: "evt-1",
      staffId: "staff-2",
    });
  });

  it("returns null for non-matching URL", () => {
    const result = matchRoute(SAMPLE_ROUTES, "/api/nonexistent", "GET");
    expect(result).toBeNull();
  });

  it("returns null for wrong HTTP method", () => {
    const result = matchRoute(SAMPLE_ROUTES, "/api/kitchen/prep-tasks", "POST");
    expect(result).toBeNull();
  });

  it("strips query parameters before matching", () => {
    const result = matchRoute(
      SAMPLE_ROUTES,
      "/api/kitchen/prep-tasks?status=active&limit=10",
      "GET"
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("preptask-list");
  });

  it("handles URLs without leading slash", () => {
    const result = matchRoute(SAMPLE_ROUTES, "api/kitchen/prep-tasks", "GET");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("preptask-list");
  });

  it("does not match partial paths", () => {
    // /api/kitchen/prep-tasks/abc-123/extra should NOT match preptask-get
    const result = matchRoute(
      SAMPLE_ROUTES,
      "/api/kitchen/prep-tasks/abc-123/extra",
      "GET"
    );
    expect(result).toBeNull();
  });

  it("returns null for empty routes array", () => {
    const result = matchRoute([], "/api/anything", "GET");
    expect(result).toBeNull();
  });
});
