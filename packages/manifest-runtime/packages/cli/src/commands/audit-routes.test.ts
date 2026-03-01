import { describe, expect, it } from "vitest";
import type { ExemptionEntry, OwnershipAuditContext } from "./audit-routes";
import {
  auditRouteFileContent,
  OWNERSHIP_RULE_CODES,
  validateExemptions,
} from "./audit-routes";

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

  it("accepts write routes that use executeManifestCommand (indirect runCommand)", () => {
    const content = `
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export async function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "KitchenTask",
    commandName: "create",
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return executeManifestCommand(request, {
    entityName: "KitchenTask",
    commandName: "update",
    params: { id },
    transformBody: (body, ctx) => ({ ...body, id }),
  });
}
`;

    const result = auditRouteFileContent(
      content,
      "app/api/kitchen/tasks/route.ts",
      OPTIONS
    );
    const bypassFindings = result.findings.filter(
      (f) => f.code === "WRITE_ROUTE_BYPASSES_RUNTIME"
    );
    expect(bypassFindings).toHaveLength(0);
  });

  it("does not warn about missing user context for executeManifestCommand routes", () => {
    const content = `
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export async function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "KitchenTask",
    commandName: "create",
  });
}
`;

    const result = auditRouteFileContent(
      content,
      "app/api/kitchen/tasks/route.ts",
      OPTIONS
    );
    const userContextFindings = result.findings.filter(
      (f) => f.code === "WRITE_ROUTE_USER_CONTEXT_NOT_VISIBLE"
    );
    expect(userContextFindings).toHaveLength(0);
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

    it("does not flag an orphan command route that is exempted", () => {
      const content = `
export async function POST(request: Request) {
  const runtime = createManifestRuntime({ user: { id: userId, tenantId } });
  return runtime.runCommand("create", {});
}
`;
      const ctx = makeOwnershipContext({
        commandManifestPaths: new Set([
          "staff/shifts/commands/create/route.ts",
        ]),
        exemptions: [
          {
            path: "app/api/staff/shifts/commands/create-validated/route.ts",
            methods: ["POST"],
            reason: "Validated shift create — composite with extra validation",
            category: "composite",
          },
        ],
      });

      const result = auditRouteFileContent(
        content,
        "/repo/apps/api/app/api/staff/shifts/commands/create-validated/route.ts",
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

    it("suppresses WRITE_ROUTE_BYPASSES_RUNTIME for exempted routes", () => {
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
        result.findings.some((f) => f.code === "WRITE_ROUTE_BYPASSES_RUNTIME")
      ).toBe(false);
    });

    it("still flags WRITE_ROUTE_BYPASSES_RUNTIME for non-exempted routes", () => {
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
        result.findings.some((f) => f.code === "WRITE_ROUTE_BYPASSES_RUNTIME")
      ).toBe(true);
    });

    it("suppresses WRITE_ROUTE_BYPASSES_RUNTIME only for exempted methods", () => {
      const content = `
export async function POST(request: Request) {
  await database.timecard.create({ data: {} });
  return Response.json({ ok: true });
}
export async function PUT(request: Request) {
  await database.timecard.update({ data: {} });
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
      const bypassFindings = result.findings.filter(
        (f) => f.code === "WRITE_ROUTE_BYPASSES_RUNTIME"
      );
      // POST is exempted, PUT is not — only PUT should fire
      expect(bypassFindings).toHaveLength(1);
      expect(bypassFindings[0]?.message).toContain("PUT");
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
        result.findings.some((f) => OWNERSHIP_RULE_CODES.has(f.code))
      ).toBe(false);
    });
  });

  describe("OWNERSHIP_RULE_CODES canonical set", () => {
    it("contains exactly the three ownership rules", () => {
      expect(OWNERSHIP_RULE_CODES.size).toBe(3);
      expect(OWNERSHIP_RULE_CODES.has("COMMAND_ROUTE_ORPHAN")).toBe(true);
      expect(
        OWNERSHIP_RULE_CODES.has("COMMAND_ROUTE_MISSING_RUNTIME_CALL")
      ).toBe(true);
      expect(OWNERSHIP_RULE_CODES.has("WRITE_OUTSIDE_COMMANDS_NAMESPACE")).toBe(
        true
      );
    });

    it("does not contain quality/hygiene rules", () => {
      expect(OWNERSHIP_RULE_CODES.has("WRITE_ROUTE_BYPASSES_RUNTIME")).toBe(
        false
      );
      expect(OWNERSHIP_RULE_CODES.has("READ_MISSING_SOFT_DELETE_FILTER")).toBe(
        false
      );
      expect(OWNERSHIP_RULE_CODES.has("READ_MISSING_TENANT_SCOPE")).toBe(false);
      expect(
        OWNERSHIP_RULE_CODES.has("READ_LOCATION_REFERENCE_WITHOUT_FILTER")
      ).toBe(false);
    });

    it("strict mode: route with only WRITE_ROUTE_BYPASSES_RUNTIME produces no ownership findings", () => {
      const content = `
export async function POST(request: Request) {
  await database.prepTask.create({ data: {} });
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
      // Should have WRITE_ROUTE_BYPASSES_RUNTIME (error) + WRITE_OUTSIDE_COMMANDS_NAMESPACE (warning)
      // but WRITE_ROUTE_BYPASSES_RUNTIME is NOT an ownership rule
      const ownershipFindings = result.findings.filter((f) =>
        OWNERSHIP_RULE_CODES.has(f.code)
      );
      const nonOwnershipErrors = result.findings.filter(
        (f) => f.severity === "error" && !OWNERSHIP_RULE_CODES.has(f.code)
      );
      // Non-ownership errors exist (WRITE_ROUTE_BYPASSES_RUNTIME)
      expect(nonOwnershipErrors.length).toBeGreaterThan(0);
      expect(nonOwnershipErrors[0]?.code).toBe("WRITE_ROUTE_BYPASSES_RUNTIME");
      // Ownership findings also exist (WRITE_OUTSIDE_COMMANDS_NAMESPACE)
      expect(ownershipFindings.length).toBeGreaterThan(0);
    });

    it("strict mode: orphan command route produces ownership finding", () => {
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
      const ownershipFindings = result.findings.filter((f) =>
        OWNERSHIP_RULE_CODES.has(f.code)
      );
      expect(ownershipFindings.length).toBeGreaterThan(0);
      expect(ownershipFindings[0]?.code).toBe("COMMAND_ROUTE_ORPHAN");
    });
  });
});

describe("validateExemptions", () => {
  const completeEntry: ExemptionEntry = {
    path: "app/api/cron/job/route.ts",
    methods: ["POST"],
    reason: "Cron job",
    category: "infrastructure",
    owner: "platform-team",
    allowPermanent: true,
  };

  const entryWithExpiry: ExemptionEntry = {
    path: "app/api/legacy/route.ts",
    methods: ["POST"],
    reason: "Legacy",
    category: "legacy-migrate",
    owner: "backend-team",
    expiresOn: "2026-06-01",
  };

  const entryWithExpiryDays: ExemptionEntry = {
    path: "app/api/temp/route.ts",
    methods: ["POST"],
    reason: "Temporary",
    category: "legacy-migrate",
    owner: "backend-team",
    expiresInDays: 90,
  };

  const entryMissingOwner: ExemptionEntry = {
    path: "app/api/no-owner/route.ts",
    methods: ["POST"],
    reason: "No owner set",
    category: "legacy-migrate",
    allowPermanent: true,
  };

  const entryMissingExpiry: ExemptionEntry = {
    path: "app/api/no-expiry/route.ts",
    methods: ["POST"],
    reason: "No expiry set",
    category: "legacy-migrate",
    owner: "someone",
  };

  const entryMissingBoth: ExemptionEntry = {
    path: "app/api/bare/route.ts",
    methods: ["POST"],
    reason: "Bare entry",
    category: "legacy-migrate",
  };

  it("returns no diagnostics for a fully-populated entry", () => {
    const diags = validateExemptions([completeEntry]);
    expect(diags).toHaveLength(0);
  });

  it("returns no diagnostics for entry with expiresOn + owner", () => {
    const diags = validateExemptions([entryWithExpiry]);
    expect(diags).toHaveLength(0);
  });

  it("returns no diagnostics for entry with expiresInDays + owner", () => {
    const diags = validateExemptions([entryWithExpiryDays]);
    expect(diags).toHaveLength(0);
  });

  it("flags missing owner as warning in non-strict mode", () => {
    const diags = validateExemptions([entryMissingOwner]);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.field).toBe("owner");
    expect(diags[0]?.severity).toBe("warning");
  });

  it("flags missing owner as error in strict mode", () => {
    const diags = validateExemptions([entryMissingOwner], { strict: true });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.field).toBe("owner");
    expect(diags[0]?.severity).toBe("error");
  });

  it("flags missing expiry (without allowPermanent) as warning in non-strict mode", () => {
    const diags = validateExemptions([entryMissingExpiry]);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.field).toBe("expiresOn");
    expect(diags[0]?.severity).toBe("warning");
  });

  it("flags missing expiry (without allowPermanent) as error in strict mode", () => {
    const diags = validateExemptions([entryMissingExpiry], { strict: true });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.field).toBe("expiresOn");
    expect(diags[0]?.severity).toBe("error");
  });

  it("flags both missing owner and missing expiry on a bare entry", () => {
    const diags = validateExemptions([entryMissingBoth]);
    expect(diags).toHaveLength(2);
    expect(diags.map((d) => d.field).sort()).toEqual(["expiresOn", "owner"]);
  });

  it("does not flag allowPermanent entries for missing expiry", () => {
    const entry: ExemptionEntry = {
      path: "app/api/perm/route.ts",
      methods: ["POST"],
      reason: "Permanent",
      category: "infrastructure",
      owner: "platform-team",
      allowPermanent: true,
    };
    const diags = validateExemptions([entry]);
    expect(diags).toHaveLength(0);
  });

  it("validates multiple entries and returns diagnostics for each", () => {
    const diags = validateExemptions([
      completeEntry,
      entryMissingOwner,
      entryMissingExpiry,
      entryMissingBoth,
    ]);
    // completeEntry: 0, missingOwner: 1, missingExpiry: 1, missingBoth: 2
    expect(diags).toHaveLength(4);
  });

  it("existing exemption matching is unaffected by new fields", () => {
    // Verify that auditRouteFileContent still works with entries that have
    // the new metadata fields — the isExempted function only checks path+methods.
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
          reason: "Legacy bulk",
          category: "legacy-migrate",
          owner: "backend-team",
          expiresOn: "2026-06-01",
        },
      ],
    });

    const result = auditRouteFileContent(
      content,
      "/repo/apps/api/app/api/timecards/route.ts",
      OPTIONS,
      ctx
    );
    // Should still be exempted — WRITE_OUTSIDE_COMMANDS_NAMESPACE should NOT fire
    expect(
      result.findings.some((f) => f.code === "WRITE_OUTSIDE_COMMANDS_NAMESPACE")
    ).toBe(false);
  });
});
