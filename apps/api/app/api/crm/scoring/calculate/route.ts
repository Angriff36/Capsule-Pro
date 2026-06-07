/**
 * CRM Lead Score Calculation API
 *
 * POST /api/crm/scoring/calculate — Recalculate scores for all leads
 *
 * Reads bypass Manifest per constitution §10. Score persistence uses Prisma
 * models instead of raw SQL writes.
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

// Allowlist of valid comparison conditions.
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

type LeadScoringField =
  | "source"
  | "companyName"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "eventType"
  | "status"
  | "estimatedGuests"
  | "estimatedValue"
  | "eventDate";

type LeadForScoring = Record<LeadScoringField, unknown>;

function leadMatchesRule(
  lead: LeadForScoring,
  field: string,
  condition: string,
  value: string
) {
  if (!VALID_CONDITIONS.has(condition)) {
    return false;
  }

  const current = lead[field as LeadScoringField];
  const currentText =
    current instanceof Date ? current.toISOString().slice(0, 10) : String(current ?? "");
  const currentNumber = Number(current);
  const ruleNumber = Number(value);

  switch (condition) {
    case "equals":
      return currentText === value;
    case "not_equals":
      return currentText !== value;
    case "gt":
      return Number.isFinite(currentNumber) && currentNumber > ruleNumber;
    case "lt":
      return Number.isFinite(currentNumber) && currentNumber < ruleNumber;
    case "gte":
      return Number.isFinite(currentNumber) && currentNumber >= ruleNumber;
    case "lte":
      return Number.isFinite(currentNumber) && currentNumber <= ruleNumber;
    case "contains":
      return currentText.toLowerCase().includes(value.toLowerCase());
    case "exists":
      return current !== null && current !== undefined && currentText !== "";
    case "not_exists":
      return current === null || current === undefined || currentText === "";
    default:
      return false;
  }
}

// POST /api/crm/scoring/calculate — Recalculate all lead scores
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

    // Resolve user context for Manifest runtime
    const user = await resolveCurrentUser(request);

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
      // Reset all lead scores to 0 via governed Manifest runtime + direct Prisma
      // for score/scoreBreakdown (non-IR derived fields)
      const zeroLeads = await database.lead.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true },
      });
      for (const lead of zeroLeads) {
        await runManifestCommand({
          entity: "Lead",
          command: "update",
          body: { id: lead.id, tenantId },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
          instanceId: lead.id,
        });
        await database.lead.updateMany({
          where: { tenantId, id: lead.id, deletedAt: null },
          data: { score: 0, scoreBreakdown: {} },
        });
      }
      return NextResponse.json({
        data: {
          updated: 0,
          distribution: { hot: 0, warm: 0, cold: 0 },
        },
      });
    }

    const leads = await database.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        source: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        eventType: true,
        status: true,
        estimatedGuests: true,
        estimatedValue: true,
        eventDate: true,
      },
    });

    for (const lead of leads) {
      let score = 0;
      const scoreBreakdown: Record<string, string> = {};

      for (const rule of rules) {
        if (leadMatchesRule(lead, rule.field, rule.condition, rule.value)) {
          score += rule.points;
          scoreBreakdown[rule.id] = String(rule.points);
          scoreBreakdown[`rule_name_${rule.id}`] = rule.rule_name;
        }
      }

      // Governed update via Manifest runtime + direct Prisma for score/scoreBreakdown
      // (non-IR derived fields not modeled in Lead manifest entity)
      await runManifestCommand({
        entity: "Lead",
        command: "update",
        body: { id: lead.id, tenantId },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
        instanceId: lead.id,
      });
      await database.lead.updateMany({
        where: {
          tenantId,
          id: lead.id,
          deletedAt: null,
        },
        data: {
          score,
          scoreBreakdown,
        },
      });
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
