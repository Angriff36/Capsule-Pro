Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const GET = async (_request, context) => {
  const inline = new URL(_request.url).searchParams.get("inline") === "1";
  const { importId } = await context.params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const [row] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT file_name, mime_type, content
      FROM tenant_events.event_imports
      WHERE tenant_id = ${tenantId}
        AND id = ${importId}
      LIMIT 1
    `);
  if (!row) {
    return server_2.NextResponse.json(
      { message: "Not found" },
      { status: 404 }
    );
  }
  const body = row.content ? new Uint8Array(row.content) : null;
  return new server_2.NextResponse(body, {
    headers: {
      "Content-Type": row.mime_type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${row.file_name}"`,
    },
  });
};
exports.GET = GET;
