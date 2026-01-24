Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function GET(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    const { getEmployeePerformanceSummary } = await import(
      "../../../../(authenticated)/analytics/staff/actions/get-employee-performance"
    );
    const summary = await getEmployeePerformanceSummary();
    return server_2.NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching employee performance summary:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch employee performance summary" },
      { status: 500 }
    );
  }
}
