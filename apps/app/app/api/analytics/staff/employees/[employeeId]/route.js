Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function GET(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { employeeId } = await params;
  try {
    const { getEmployeePerformance } = await import(
      "../../../../../(authenticated)/analytics/staff/actions/get-employee-performance"
    );
    const metrics = await getEmployeePerformance(employeeId);
    return server_2.NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching employee performance:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch employee performance" },
      { status: 500 }
    );
  }
}
