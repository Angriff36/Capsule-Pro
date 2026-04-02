/**
 * CRM Lead Score Calculation API
 *
 * POST /api/crm/scoring/calculate — Recalculate scores for all leads
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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

// Build SQL condition expression for a single rule
function buildRuleCondition(field: string, condition: string, value: string): string {
  const column = FIELD_COLUMN_MAP[field] ?? field;
  const colRef = `"${column}"`;

  switch (condition) {
    case "equals":
      return `${colRef} = '${value.replace(/'/g, "''")}'`;
    case "not_equals":
      return `${colRef} != '${value.replace(/'/g, "''")}'`;
    case "gt":
      return `${colRef} > '${value.replace(/'/g, "''")}'`;
    case "lt":
      return `${colRef} < '${value.replace(/'/g, "''")}'`;
    case "gte":
      return `${colRef} >= '${value.replace(/'/g, "''")}'`;
    case "lte":
      return `${colRef} <= '${value.replace(/'/g, "''")}'`;
    case "contains":
      return `${colRef} ILIKE '%${value.replace(/'/g, "''")}%'`;
    case "exists":
      return `${colRef} IS NOT NULL AND ${colRef} != ''`;
    case "not_exists":
      return `(${colRef} IS NULL OR ${colRef} = '')`;
    default:
      return "false";
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
      return NextResponse.json({ message: "Tenant not found" }, { status: 400 });
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

    // Build a single SQL expression that computes the score per lead
    // We'll use a PL/pgSQL block for atomicity
    const ruleExpressions = rules.map((rule) => {
      const cond = buildRuleCondition(rule.field, rule.condition, rule.value);
      return `  IF ${cond} THEN total_score := total_score + ${rule.points}; breakdown['${rule.id}'] := '${rule.points}'; END IF;`;
    });

    // Build dynamic SQL for the update
    // We need to evaluate all rules per lead and compute the total
    const updateSql = `
      UPDATE tenant_crm.leads
      SET
        score = CASE
          ${rules.map((rule) => {
            const cond = buildRuleCondition(rule.field, rule.condition, rule.value);
            return `WHEN ${cond} THEN score + ${rule.points}`;
          }).join("\n          ")}
          ELSE score
        END,
        updated_at = NOW()
      WHERE tenant_id = '${tenantId}'::uuid AND deleted_at IS NULL;
    `;

    // Execute the update for each rule's condition by running a single update per rule
    // This is safer than a complex PL/pgSQL block
    for (const rule of rules) {
      const cond = buildRuleCondition(rule.field, rule.condition, rule.value);
      const sql = `
        UPDATE tenant_crm.leads
        SET
          score = score + ${rule.points},
          score_breakdown = score_breakdown || '{"${rule.id}": "${rule.points}", "rule_name_${rule.id}": "${rule.rule_name.replace(/"/g, "\\\"")}"}'::jsonb,
          updated_at = NOW()
        WHERE tenant_id = '${tenantId}'::uuid
          AND deleted_at IS NULL
          AND ${cond}
      `;
      await database.$executeRawUnsafe(sql);
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
    console.error("Error calculating scores:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
