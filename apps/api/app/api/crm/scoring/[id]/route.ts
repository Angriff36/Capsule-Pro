/**
 * CRM Scoring Rule by ID API
 *
 * PUT    /api/crm/scoring/[id]  - Update a scoring rule
 * DELETE /api/crm/scoring/[id]  - Delete a scoring rule
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

// PUT /api/crm/scoring/[id] — Update a scoring rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { rule_name, field, condition, value, points, is_active, priority } =
      body;

    // Verify rule exists and belongs to tenant
    const existing = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id FROM tenant_crm.crm_scoring_rules
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    const updateResult = await database.$executeRaw`
      UPDATE tenant_crm.crm_scoring_rules
      SET
        rule_name = COALESCE(${rule_name ?? null}, rule_name),
        field = COALESCE(${field ?? null}, field),
        condition = COALESCE(${condition ?? null}, condition),
        value = COALESCE(${value ?? null}, value)::varchar,
        points = COALESCE(${points ?? null}, points),
        is_active = COALESCE(${is_active ?? null}, is_active),
        priority = COALESCE(${priority ?? null}, priority),
        updated_at = NOW()
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (updateResult === 0) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    const refreshed = await database.$queryRaw<
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
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `
    );

    return NextResponse.json({ data: refreshed[0] });
  } catch (error) {
    captureException(error);
    log.error("Error updating scoring rule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/crm/scoring/[id] — Delete a scoring rule
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const deleted = await database.$executeRaw`
      DELETE FROM tenant_crm.crm_scoring_rules
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (deleted === 0) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureException(error);
    log.error("Error deleting scoring rule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
