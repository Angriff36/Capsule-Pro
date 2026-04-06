import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  before_value: unknown;
  after_value: unknown;
  ip_address: string | null;
  created_at: Date;
}

interface CountRow {
  count: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const page =
    Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10)) || 1;
  const limit =
    Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10))
    ) || 1;
  const offset = (page - 1) * limit;

  const filterUserId = searchParams.get("userId");
  const filterAction = searchParams.get("action");
  const filterEntityType = searchParams.get("entityType");
  const filterStartDate = searchParams.get("startDate");
  const filterEndDate = searchParams.get("endDate");

  // Build WHERE conditions
  const conditions: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (filterUserId) {
    conditions.push(`user_id = $${paramIndex}`);
    params.push(filterUserId);
    paramIndex++;
  }

  if (filterAction) {
    conditions.push(`action = $${paramIndex}`);
    params.push(filterAction.toUpperCase());
    paramIndex++;
  }

  if (filterEntityType) {
    conditions.push(`entity_type = $${paramIndex}`);
    params.push(filterEntityType);
    paramIndex++;
  }

  if (filterStartDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(new Date(filterStartDate));
    paramIndex++;
  }

  if (filterEndDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(new Date(filterEndDate));
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  // Execute count query
  const countQuery = `
    SELECT COUNT(*)::text as count
    FROM "tenant_admin"."audit_log"
    WHERE ${whereClause}
  `;

  const countResult = await database.$queryRawUnsafe<CountRow[]>(
    countQuery,
    ...params
  );

  const total = Number.parseInt(countResult[0]?.count || "0", 10);

  // Execute data query
  const dataQuery = `
    SELECT 
      id,
      user_id,
      user_email,
      action,
      entity_type,
      entity_id,
      entity_name,
      before_value,
      after_value,
      ip_address,
      created_at
    FROM "tenant_admin"."audit_log"
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const rows = await database.$queryRawUnsafe<AuditLogRow[]>(
    dataQuery,
    ...params
  );

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      beforeValue: row.before_value,
      afterValue: row.after_value,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
