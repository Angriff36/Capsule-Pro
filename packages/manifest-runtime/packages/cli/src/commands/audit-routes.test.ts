import { describe, expect, it } from "vitest";
import { auditRouteFileContent } from "./audit-routes";

const OPTIONS = {
  tenantField: "tenantId",
  deletedField: "deletedAt",
  locationField: "locationId",
};

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
});
