import { describe, expect, it } from "vitest";
import type { OwnershipAuditContext } from "./audit-routes";
import { auditRouteFileContent } from "./audit-routes";

const OPTIONS = {
  tenantField: "tenantId",
  deletedField: "deletedAt",
  locationField: "locationId",
};

/**
 * Build a minimal ownership context for testing.
 * commandManifestPaths: set of expected command route paths (domain-relative).
 * exemptions: list of exempted routes.
 */
function makeOwnershipContext(
  overrides: Partial<OwnershipAuditContext> = {}
): OwnershipAuditContext {
  return {
    commandManifestPaths:
      overrides.commandManifestPaths ??
      new Set([
        "kitchen/prep-tasks/commands/create/route.ts",
        "kitchen/prep-tasks/commands/claim/route.ts",
        "kitchen/prep-tasks/commands/complete/route.ts",
      ]),
    exemptions: overrides.exemptions ?? [],
  };
}

describe("audit-routes", () => {
  it("flags write routes that do not use runCommand", () => {
    const content = `
export async function POST() {
  return Response.json({ ok: true });
}
`;

    const result = auditRouteFileContent(
      content,
      "app/api/items/create/route.ts",
      OPTIONS
    );
    expect(
      result.findings.some((f) => f.code === "WRITE_ROUTE_BYPASSES_RUNTIME")
    ).toBe(true);
  });

  it("accepts write routes that use runCommand", () => {
    const content = `
export async function POST() {
  const runtime = createManifestRuntime({ user: { id: userId, tenantId } });
  return runtime.runCommand("create", {});
}
`;

    const result = auditRouteFileContent(
      content,
      "app/api/items/create/route.ts",
      OPTIONS
    );
    expect(
      result.findings.some((f) => f.code === "WRITE_ROUTE_BYPASSES_RUNTIME")
    ).toBe(false);
  });

  it("flags direct read queries missing tenant and soft delete filters", () => {
    const content = `
export async function GET() {
  const items = await database.item.findMany({ where: { status: "active" } });
  return Response.json(items);
}
`;

    const result = auditRouteFileContent(
      content,
      "app/api/items/route.ts",
      OPTIONS
    );
    expect(
      result.findings.some((f) => f.code === "READ_MISSING_TENANT_SCOPE")
    ).toBe(true);
    expect(
      result.findings.some((f) => f.code === "READ_MISSING_SOFT_DELETE_FILTER")
    ).toBe(true);
  });

  it("flags location references without location filter", () => {
    const content = `
export async function GET(request: Request) {
  const locationId = new URL(request.url).searchParams.get("locationId");
  const items = await database.item.findMany({ where: { tenantId, deletedAt: null } });
  return Response.json({ locationId, items });
}
`;

    const result = auditRouteFileContent(
      content,
      "app/api/items/route.ts",
      OPTIONS
    );
    expect(
      result.findings.some(
        (f) => f.code === "READ_LOCATION_REFERENCE_WITHOUT_FILTER"
      )
    ).toBe(true);
  });

  it("does not flag compliant direct read query", () => {
    const content = `
export async function GET() {
  const items = await database.item.findMany({
    where: { tenantId, deletedAt: null, locationId },
  });
  return Response.json(items);
}
`;

    const result = auditRouteFileContent(
      content,
      "app/api/items/route.ts",
      OPTIONS
    );
    expect(result.findings).toHaveLength(0);
  });

  // --- Ownership rules (Tests D-G from the plan) ---

  describe("COMMAND_ROUTE_ORPHAN (Test D)", () => {
    it("flags a command route that is NOT in commands.json", () => {
      const content = `
export async function POST(request: Request) {
  const runtime = createManifestRuntime({ user: { id: userId, tenantId } });
  return runtime.runCommand("foo", {});
}
`;
      const ctx = makeOwnershipContext({
        commandManifestPaths: new Set([
          "kitchen/prep-tasks/commands/create/route.ts",
        ]),
      });

      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/kitchen/prep-tasks/commands/foo/route.ts",
        OPTIONS,
        ctx
      );
      expect(
        result.findings.some((f) => f.code === "COMMAND_ROUTE_ORPHAN")
      ).toBe(true);
    });

    it("does not flag a command route that IS in commands.json", () => {
      const content = `
export async function POST(request: Request) {
  const runtime = createManifestRuntime({ user: { id: userId, tenantId } });
  return runtime.runCommand("create", {});
}
`;
      const ctx = makeOwnershipContext({
        commandManifestPaths: new Set([
          "kitchen/prep-tasks/commands/create/route.ts",
        ]),
      });

      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/kitchen/prep-tasks/commands/create/route.ts",
        OPTIONS,
        ctx
      );
      expect(
        result.findings.some((f) => f.code === "COMMAND_ROUTE_ORPHAN")
      ).toBe(false);
    });
  });

  describe("WRITE_OUTSIDE_COMMANDS_NAMESPACE (Test E)", () => {
    it("flags a write route outside commands namespace with no exemption", () => {
      const content = `
export async function POST(request: Request) {
  await database.timecard.create({ data: {} });
  return Response.json({ ok: true });
}
`;
      const ctx = makeOwnershipContext({ exemptions: [] });

      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/timecards/route.ts",
        OPTIONS,
        ctx
      );
      expect(
        result.findings.some(
          (f) => f.code === "WRITE_OUTSIDE_COMMANDS_NAMESPACE"
        )
      ).toBe(true);
    });
  });

  describe("Exemption suppresses violation (Test F)", () => {
    it("does not flag an exempted write route outside commands namespace", () => {
      const content = `
export async function POST(request: Request) {
  await database.timecard.create({ data: {} });
  return Response.json({ ok: true });
}
`;
      const ctx = makeOwnershipContext({
        exemptions: [
          {
            path: "app/api/timecards/route.ts",
            methods: ["POST"],
            reason: "Legacy bulk — migrate to Manifest command",
            category: "legacy-migrate",
          },
        ],
      });

      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/timecards/route.ts",
        OPTIONS,
        ctx
      );
      expect(
        result.findings.some(
          (f) => f.code === "WRITE_OUTSIDE_COMMANDS_NAMESPACE"
        )
      ).toBe(false);
    });
  });

  describe("COMMAND_ROUTE_MISSING_RUNTIME_CALL", () => {
    it("flags a command route that does not call runCommand", () => {
      const content = `
export async function POST(request: Request) {
  await database.prepTask.create({ data: {} });
  return Response.json({ ok: true });
}
`;
      const ctx = makeOwnershipContext();

      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/kitchen/prep-tasks/commands/create/route.ts",
        OPTIONS,
        ctx
      );
      expect(
        result.findings.some(
          (f) => f.code === "COMMAND_ROUTE_MISSING_RUNTIME_CALL"
        )
      ).toBe(true);
    });

    it("does not flag a command route that calls runCommand", () => {
      const content = `
export async function POST(request: Request) {
  const runtime = createManifestRuntime({ user: { id: userId, tenantId } });
  return runtime.runCommand("create", {});
}
`;
      const ctx = makeOwnershipContext();

      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/kitchen/prep-tasks/commands/create/route.ts",
        OPTIONS,
        ctx
      );
      expect(
        result.findings.some(
          (f) => f.code === "COMMAND_ROUTE_MISSING_RUNTIME_CALL"
        )
      ).toBe(false);
    });
  });

  describe("ownership rules do not fire without context", () => {
    it("does not flag ownership issues when no context is provided", () => {
      const content = `
export async function POST(request: Request) {
  await database.prepTask.create({ data: {} });
  return Response.json({ ok: true });
}
`;
      // No ownership context passed — only legacy rules fire
      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/kitchen/prep-tasks/commands/create/route.ts",
        OPTIONS
      );
      expect(
        result.findings.some(
          (f) =>
            f.code === "COMMAND_ROUTE_MISSING_RUNTIME_CALL" ||
            f.code === "COMMAND_ROUTE_ORPHAN" ||
            f.code === "WRITE_OUTSIDE_COMMANDS_NAMESPACE"
        )
      ).toBe(false);
    });
  });
});
