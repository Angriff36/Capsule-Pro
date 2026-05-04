/**
 * CRM Scoring Rules API
 *
 * GET  /api/crm/scoring     - List all scoring rules for tenant
 * POST /api/crm/scoring     - Create a new scoring rule
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

export const runtime = "nodejs";

// GET /api/crm/scoring — List scoring rules
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const rules = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        rule_name: string;
        field: string;
        condition: string;
        value: string;
        points: number;
        is_active: boolean;
        priority: number;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT id, tenant_id, rule_name, field, condition, value, points, is_active, priority, created_at, updated_at
        FROM tenant_crm.crm_scoring_rules
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY priority ASC, created_at ASC
      `
    );

    return NextResponse.json({ data: rules });
  } catch (error) {
    captureException(error);
    log.error("Error listing scoring rules:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/crm/scoring — Create a scoring rule
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      rule_name,
      field,
      condition,
      value,
      points,
      is_active = true,
      priority = 0,
    } = body;

    if (
      !(rule_name && field && condition) ||
      value === undefined ||
      points === undefined
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const validConditions = [
      "equals",
      "gt",
      "lt",
      "gte",
      "lte",
      "contains",
      "exists",
      "not_equals",
    ];
    if (!validConditions.includes(condition)) {
      return NextResponse.json(
        { message: "Invalid condition type" },
        { status: 400 }
      );
    }

    const validFields = [
      "source",
      "companyName",
      "contactName",
      "contactEmail",
      "contactPhone",
      "eventType",
      "status",
      "estimatedGuests",
      "estimatedValue",
      "eventDate",
    ];
    if (!validFields.includes(field)) {
      return NextResponse.json({ message: "Invalid field" }, { status: 400 });
    }

    const rule = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        rule_name: string;
        field: string;
        condition: string;
        value: string;
        points: number;
        is_active: boolean;
        priority: number;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        INSERT INTO tenant_crm.crm_scoring_rules
          (tenant_id, rule_name, field, condition, value, points, is_active, priority)
        VALUES
          (${tenantId}::uuid, ${rule_name}, ${field}, ${condition}, ${String(value)}, ${Number(points)}, ${Boolean(is_active)}, ${Number(priority)})
        RETURNING id, tenant_id, rule_name, field, condition, value, points, is_active, priority, created_at, updated_at
      `
    );

    return NextResponse.json({ data: rule[0] }, { status: 201 });
  } catch (error) {
    captureException(error);
    log.error("Error creating scoring rule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
