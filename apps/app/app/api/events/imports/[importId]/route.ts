import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{
    importId: string;
  }>;
}

export const GET = async (_request: Request, context: RouteContext) => {
  const inline = new URL(_request.url).searchParams.get("inline") === "1";
  const { importId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const [row] = await database.$queryRaw<
    { file_name: string; mime_type: string; content: Buffer }[]
  >(
    Prisma.sql`
      SELECT file_name, mime_type, content
      FROM tenant_events.event_imports
      WHERE tenant_id = ${tenantId}
        AND id = ${importId}
      LIMIT 1
    `
  );

  if (!row) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = row.content ? new Uint8Array(row.content) : null;

  return new NextResponse(body, {
    headers: {
      "Content-Type": row.mime_type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${row.file_name}"`,
    },
  });
};
