/**
 * CRM Scoring Rule by ID API
 *
 * PUT    /api/crm/scoring/[id]  - Update a scoring rule (Manifest governed)
 * DELETE /api/crm/scoring/[id]  - Soft-delete a scoring rule (Manifest governed)
 */

import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

// PUT /api/crm/scoring/[id] — Update a scoring rule via Manifest runtime
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveCurrentUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { rule_name, field, condition, value, points, is_active, priority } =
      body;

    // Verify rule exists and belongs to tenant (read per constitution §10)
    const existing = await database.$queryRaw<
      Array<{
        id: string;
        rule_name: string;
        field: string;
        condition: string;
        value: string;
        points: number;
        is_active: boolean;
        priority: number;
      }>
    >(
      Prisma.sql`
        SELECT id, rule_name, field, condition, value, points, is_active, priority
        FROM tenant_crm.crm_scoring_rules
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}::uuid
      `
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    const current = existing[0];

    // Merge incoming values with current values (COALESCE semantics from old route)
    const mergedRuleName = rule_name ?? current.rule_name;
    const mergedField = field ?? current.field;
    const mergedCondition = condition ?? current.condition;
    const mergedValue = value ?? current.value;
    const mergedPoints = points ?? current.points;
    const mergedIsActive = is_active ?? current.is_active;
    const mergedPriority = priority ?? current.priority;

    // Dispatch governed write through Manifest runtime
    const result = await runManifestCommand({
      entity: "CrmScoringRule",
      command: "update",
      body: {
        id,
        tenantId: user.tenantId,
        ruleName: mergedRuleName,
        field: mergedField,
        condition: mergedCondition,
        value: mergedValue,
        points: mergedPoints,
        isActive: mergedIsActive,
        priority: mergedPriority,
      },
      user,
    });

    if (result.status >= 400) {
      return result;
    }

    // Fetch refreshed row for response (read per §10)
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
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}::uuid
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

// DELETE /api/crm/scoring/[id] — Soft-delete a scoring rule via Manifest runtime
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveCurrentUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify rule exists (read per §10)
    const existing = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id FROM tenant_crm.crm_scoring_rules
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}::uuid
      `
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    // Dispatch governed soft-delete through Manifest runtime
    const result = await runManifestCommand({
      entity: "CrmScoringRule",
      command: "softDelete",
      body: {
        id,
        tenantId: user.tenantId,
      },
      user,
    });

    if (result.status >= 400) {
      return result;
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
