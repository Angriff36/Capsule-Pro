Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const database_1 = require("@repo/database");
const server_1 = require("next/server");
const server_2 = require("@repo/auth/server");
const tenant_1 = require("@/app/lib/tenant");
// POST /api/inventory/alerts/subscribe
// Body: {channel: "email"|"slack"|"webhook", destination}
async function POST(request) {
  try {
    // Get authenticated user and tenant
    const { orgId, userId: clerkId } = await (0, server_2.auth)();
    if (!(orgId && clerkId)) {
      return server_1.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { channel, destination } = await request.json();
    if (!(channel && destination)) {
      return server_1.NextResponse.json(
        { error: "Missing channel or destination" },
        { status: 400 }
      );
    }
    const config = await database_1.database.alertsConfig.create({
      data: {
        tenantId,
        channel,
        destination,
      },
    });
    return server_1.NextResponse.json(config);
  } catch (error) {
    return server_1.NextResponse.json(
      { error: "Failed to subscribe to alerts" },
      { status: 500 }
    );
  }
}
