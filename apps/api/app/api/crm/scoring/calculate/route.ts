/**
 * CRM Lead Score Calculation API
 *
 * POST /api/crm/scoring/calculate — Recalculate scores for all leads
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

export const runtime = "nodejs";

// Valid rule fields and their SQL column names
const FIELD_COLUMN_MAP: Record<string, string> = {
  source: "source",
  companyName: "company_name",
  contactName: "contact_name",
  contactEmail: "contact_email",
  contactPhone: "contact_phone",
  eventType: "event_type",
  status: "status",
  estimatedGuests: "estimated_guests",
  estimatedValue: "estimated_value",
  eventDate: "event_date",
};

// Allowlist of valid comparison conditions. Anything else is rejected as a
// no-op so attacker-controlled rule rows cannot inject arbitrary SQL.
const VALID_CONDITIONS = new Set([
  "equals",
  "not_equals",
  "gt",
  "lt",
  "gte",
  "lte",
  "contains",
  "exists",
  "not_exists",
]);

// Build a parameterized SQL condition for a single rule. The column is
// resolved through an allowlist (FIELD_COLUMN_MAP) so the identifier is never
// taken from user input. Prisma.raw is used within Prisma.sql template to
// safely embed the column identifier without SQL injection risk.
function buildRuleCondition(
  field: string,
  condition: string,
  value: string
): Prisma.Sql | null {
  const column = FIELD_COLUMN_MAP[field];
  if (!column) {
    return null;
  }

  // Use Prisma.sql identifier to safely quote the column name
  const colRef = Prisma.sql`${Prisma.raw(column)}`;

  if (!VALID_CONDITIONS.has(condition)) {
    return null;
  }

  switch (condition) {
    case "equals":
      return Prisma.sql`${colRef} = ${value}`;
    case "not_equals":
      return Prisma.sql`${colRef} != ${value}`;
    case "gt":
      return Prisma.sql`${colRef} > ${value}`;
    case "lt":
      return Prisma.sql`${colRef} < ${value}`;
    case "gte":
      return Prisma.sql`${colRef} >= ${value}`;
    case "lte":
      return Prisma.sql`${colRef} <= ${value}`;
    case "contains":
      return Prisma.sql`${colRef} ILIKE ${`%${value}%`}`;
    case "exists":
      return Prisma.sql`${colRef} IS NOT NULL AND ${colRef} != ''`;
    case "not_exists":
      return Prisma.sql`(${colRef} IS NULL OR ${colRef} = '')`;
    default:
      return null;
  }
}

// POST /api/crm/scoring/calculate — Recalculate all lead scores
export async function POST(_request: NextRequest) {
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

    // Fetch all active rules ordered by priority
    const rules = await database.$queryRaw<
      Array<{
        id: string;
        rule_name: string;
        field: string;
        condition: string;
        value: string;
        points: number;
        priority: number;
      }>
    >(
      Prisma.sql`
        SELECT id, rule_name, field, condition, value, points, priority
        FROM tenant_crm.crm_scoring_rules
        WHERE tenant_id = ${tenantId}::uuid AND is_active = true
        ORDER BY priority ASC, created_at ASC
      `
    );

    if (rules.length === 0) {
      // No rules — reset all leads to score 0
      await database.$executeRaw`
        UPDATE tenant_crm.leads
        SET score = 0, score_breakdown = '{}'::jsonb, updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
      `;
      return NextResponse.json({
        data: {
          updated: 0,
          distribution: { hot: 0, warm: 0, cold: 0 },
        },
      });
    }

    // Reset all leads to score 0 so a rerun produces a deterministic result
    // (otherwise repeated calls would keep adding to the prior score).
    await database.$executeRaw`
      UPDATE tenant_crm.leads
      SET score = 0, score_breakdown = '{}'::jsonb, updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
    `;

    // Apply each rule with a parameterized UPDATE. The condition fragment is
    // built via Prisma.sql with an allowlisted column reference and bound
    // value parameters, so user-supplied rule values cannot inject SQL.
    // jsonb_build_object is used instead of string concatenation so rule
    // names containing quotes/backslashes can never break the JSONB literal.
    for (const rule of rules) {
      const cond = buildRuleCondition(rule.field, rule.condition, rule.value);
      if (!cond) {
        continue;
      }
      await database.$executeRaw(Prisma.sql`
        UPDATE tenant_crm.leads
        SET
          score = score + ${rule.points},
          score_breakdown = score_breakdown || jsonb_build_object(
            ${rule.id}::text, ${rule.points}::text,
            ${`rule_name_${rule.id}`}::text, ${rule.rule_name}::text
          ),
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND ${cond}
      `);
    }

    // Get updated distribution
    const distribution = await database.$queryRaw<
      Array<{ bucket: string; count: bigint }>
    >(
      Prisma.sql`
        SELECT
          CASE
            WHEN score >= 80 THEN 'hot'
            WHEN score >= 50 THEN 'warm'
            ELSE 'cold'
          END AS bucket,
          COUNT(*)::bigint AS count
        FROM tenant_crm.leads
        WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
        GROUP BY bucket
      `
    );

    const updated = await database.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM tenant_crm.leads
        WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
      `
    );

    const distMap: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
    for (const row of distribution) {
      distMap[row.bucket] = Number(row.count);
    }

    return NextResponse.json({
      data: {
        updated: Number(updated[0]?.count ?? 0),
        distribution: distMap,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error calculating scores:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
