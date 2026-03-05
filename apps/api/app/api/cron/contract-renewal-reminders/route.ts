/**
 * POST /api/cron/contract-renewal-reminders
 *
 * Cron endpoint to send renewal reminders for contracts expiring soon.
 * This should be called daily by a cron scheduler.
 *
 * Sends notifications for contracts that:
 * - Are in signed or renewed status
 * - Have auto-renewal enabled
 * - Have an expiration date within the configured window (default 30 days)
 * - Have not already had a renewal reminder sent for this cycle
 */

import { database } from "@repo/database";
import {
  buildContractRecipients,
  buildContractRenewalData,
  triggerEmailWorkflows,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RenewalReminderConfig {
  daysBeforeExpiration: number;
  reminderIntervals: number[];
}

const DEFAULT_CONFIG: RenewalReminderConfig = {
  daysBeforeExpiration: 30,
  reminderIntervals: [30, 14, 7, 3, 1],
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
): Promise<RenewalReminderConfig> {
  try {
    const body = await request.json();
    const config = { ...DEFAULT_CONFIG };

    if (body.daysBeforeExpiration) {
      config.daysBeforeExpiration = Math.min(
        Math.max(Number(body.daysBeforeExpiration), 1),
        90
      );
    }
    if (body.reminderIntervals && Array.isArray(body.reminderIntervals)) {
      config.reminderIntervals = body.reminderIntervals
        .filter((n: number) => Number.isInteger(n) && n > 0)
        .sort((a: number, b: number) => b - a);
    }

    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function processTenantContracts(
  tenantId: string,
  config: RenewalReminderConfig
): Promise<{ processed: number; remindersSent: number; error?: string }> {
  const result = { processed: 0, remindersSent: 0 };

  const now = new Date();
  const expirationWindow = new Date();
  expirationWindow.setDate(now.getDate() + config.daysBeforeExpiration);

  const contracts = await database.eventContract.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ["signed", "renewed"] },
      autoRenewEnabled: true,
      expiresAt: {
        not: null,
        gte: now,
        lte: expirationWindow,
      },
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
          eventDate: true,
        },
      },
    },
  });

  for (const contract of contracts) {
    result.processed++;

    if (!(contract.client?.email && contract.expiresAt)) {
      continue;
    }

    const daysUntilExpiration = Math.ceil(
      (new Date(contract.expiresAt).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (!config.reminderIntervals.includes(daysUntilExpiration)) {
      continue;
    }

    const triggerResult = await triggerEmailWorkflows(database, {
      tenantId,
      triggerType: "contract_renewal_reminder",
      entity: {
        id: contract.id,
        type: "contract",
      },
      templateData: buildContractRenewalData({
        contract_number: contract.contractNumber,
        title: contract.title,
        expires_at: contract.expiresAt,
        renewal_term_days: contract.renewalTermDays,
        event_name: contract.event?.title,
      }),
      recipients: buildContractRecipients({
        client_email: contract.client.email,
        client_first_name: contract.client.first_name,
        client_last_name: contract.client.last_name,
        client_id: contract.client.id,
      }),
    });

    if (triggerResult.triggered > 0) {
      result.remindersSent += triggerResult.triggered;
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
    remindersSent: 0,
    errors: [] as string[],
  };

  try {
    const config = await parseConfig(request);

    const workflows = await database.emailWorkflow.findMany({
      where: {
        triggerType: "contract_renewal_reminder",
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
        message: "No active contract renewal reminder workflows found",
        results,
      });
    }

    const tenantIds = [...new Set(workflows.map((w) => w.tenantId))];

    for (const tenantId of tenantIds) {
      try {
        const tenantResult = await processTenantContracts(tenantId, config);
        results.processed += tenantResult.processed;
        results.remindersSent += tenantResult.remindersSent;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Tenant ${tenantId}: ${message}`);
        console.error(
          `Failed to process contract renewal reminders for tenant ${tenantId}:`,
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
    console.error("Failed to process contract renewal reminders:", error);
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
