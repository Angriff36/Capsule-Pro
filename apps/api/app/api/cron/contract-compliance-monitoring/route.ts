/**
 * POST /api/cron/contract-compliance-monitoring
 *
 * Cron endpoint to monitor contract compliance status and send alerts.
 * This should be called daily by a cron scheduler.
 *
 * Monitors contracts that:
 * - Are in signed or renewed status
 * - Have not had a compliance check in the configured period (default 90 days)
 * - Have non-compliant or under-review status
 */

import { database } from "@repo/database";
import {
  buildContractComplianceData,
  buildContractRecipients,
  triggerEmailWorkflows,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ComplianceMonitoringConfig {
  reviewPeriodDays: number;
  alertOnNonCompliant: boolean;
  alertOnStale: boolean;
}

const DEFAULT_CONFIG: ComplianceMonitoringConfig = {
  reviewPeriodDays: 90,
  alertOnNonCompliant: true,
  alertOnStale: true,
};

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured - cron endpoints are unprotected");
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

async function parseConfig(
  request: NextRequest
): Promise<ComplianceMonitoringConfig> {
  try {
    const body = await request.json();
    const config = { ...DEFAULT_CONFIG };

    if (body.reviewPeriodDays) {
      config.reviewPeriodDays = Math.max(Number(body.reviewPeriodDays), 30);
    }
    if (typeof body.alertOnNonCompliant === "boolean") {
      config.alertOnNonCompliant = body.alertOnNonCompliant;
    }
    if (typeof body.alertOnStale === "boolean") {
      config.alertOnStale = body.alertOnStale;
    }

    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function processTenantContracts(
  tenantId: string,
  config: ComplianceMonitoringConfig
): Promise<{ processed: number; alertsSent: number; error?: string }> {
  const result = { processed: 0, alertsSent: 0 };

  const now = new Date();
  const staleThreshold = new Date();
  staleThreshold.setDate(now.getDate() - config.reviewPeriodDays);

  const contracts = await database.eventContract.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ["signed", "renewed"] },
      OR: [
        {
          lastComplianceCheck: {
            lt: staleThreshold,
          },
        },
        {
          complianceStatus: {
            in: ["non_compliant", "under_review"],
          },
        },
      ],
    },
    include: {
      client: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
      event: {
        select: {
          title: true,
        },
      },
    },
  });

  for (const contract of contracts) {
    result.processed++;

    const daysSinceLastCheck = contract.lastComplianceCheck
      ? Math.floor(
          (now.getTime() - new Date(contract.lastComplianceCheck).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const isStale =
      config.alertOnStale &&
      contract.lastComplianceCheck &&
      daysSinceLastCheck !== null &&
      daysSinceLastCheck > config.reviewPeriodDays;

    const isNonCompliant =
      config.alertOnNonCompliant &&
      contract.complianceStatus in ["non_compliant", "under_review"];

    if (!(isStale || isNonCompliant)) {
      continue;
    }

    const clientEmails = contract.client?.email ? [contract.client.email] : [];

    if (clientEmails.length === 0) {
      continue;
    }

    const triggerResult = await triggerEmailWorkflows(database, {
      tenantId,
      triggerType: "contract_compliance_alert",
      entity: {
        id: contract.id,
        type: "contract",
      },
      templateData: buildContractComplianceData({
        contract_number: contract.contractNumber,
        title: contract.title,
        compliance_status: contract.complianceStatus,
        event_name: contract.event?.title,
        notes: contract.notes,
      }),
      recipients: buildContractRecipients({
        client_email: contract.client?.email ?? null,
        client_first_name: contract.client?.first_name ?? null,
        client_last_name: contract.client?.last_name ?? null,
        client_id: contract.client?.id ?? null,
      }),
    });

    if (triggerResult.triggered > 0) {
      result.alertsSent += triggerResult.triggered;
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    processed: 0,
    alertsSent: 0,
    errors: [] as string[],
  };

  try {
    const config = await parseConfig(request);

    const workflows = await database.emailWorkflow.findMany({
      where: {
        triggerType: "contract_compliance_alert",
        isActive: true,
        deletedAt: null,
      },
      select: {
        tenantId: true,
      },
    });

    if (workflows.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: "No active contract compliance monitoring workflows found",
        results,
      });
    }

    const tenantIds = [...new Set(workflows.map((w) => w.tenantId))];

    for (const tenantId of tenantIds) {
      try {
        const tenantResult = await processTenantContracts(tenantId, config);
        results.processed += tenantResult.processed;
        results.alertsSent += tenantResult.alertsSent;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Tenant ${tenantId}: ${message}`);
        console.error(
          `Failed to process contract compliance for tenant ${tenantId}:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to process contract compliance monitoring:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        results,
      },
      { status: 500 }
    );
  }
}
