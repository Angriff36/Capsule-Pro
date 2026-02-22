/**
 * POST /api/cron/contract-expiration-alerts
 *
 * Cron endpoint to send expiration alerts for contracts expiring soon.
 * This should be called daily by a cron scheduler.
 *
 * Sends notifications for contracts that:
 * - Are in draft, sent, or viewed status
 * - Have an expiration date within the configured window (default 30 days)
 * - Have not already had an expiration alert sent today
 */

import { database } from "@repo/database";
import {
  buildContractRecipients,
  buildContractTemplateData,
  triggerEmailWorkflows,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";

interface AlertConfig {
  daysBeforeExpiration: number;
  reminderIntervals: number[];
}

const DEFAULT_CONFIG: AlertConfig = {
  daysBeforeExpiration: 30,
  reminderIntervals: [30, 14, 7, 3, 1],
};

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured - cron endpoints are unprotected");
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Parse configuration from request body
 */
async function parseConfig(request: NextRequest): Promise<AlertConfig> {
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

/**
 * Process contract expiration alerts for a single tenant
 */
async function processTenantContracts(
  tenantId: string,
  config: AlertConfig
): Promise<{ processed: number; alertsSent: number; error?: string }> {
  const result = { processed: 0, alertsSent: 0 };

  const now = new Date();
  const expirationWindow = new Date();
  expirationWindow.setDate(now.getDate() + config.daysBeforeExpiration);

  const contracts = await database.eventContract.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ["draft", "sent", "viewed"] },
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

    // Calculate days until expiration
    const daysUntilExpiration = Math.ceil(
      (new Date(contract.expiresAt).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Check if today matches a reminder interval
    if (!config.reminderIntervals.includes(daysUntilExpiration)) {
      continue;
    }

    const triggerResult = await triggerEmailWorkflows(database, {
      tenantId,
      triggerType: "contract_expiration",
      entity: {
        id: contract.id,
        type: "contract",
      },
      templateData: buildContractTemplateData({
        contract_number: contract.contractNumber,
        title: contract.title,
        expires_at: contract.expiresAt,
        event_name: contract.event?.title,
        event_date: contract.event?.eventDate,
      }),
      recipients: buildContractRecipients({
        client_email: contract.client.email,
        client_first_name: contract.client.first_name,
        client_last_name: contract.client.last_name,
        client_id: contract.client.id,
      }),
    });

    if (triggerResult.triggered > 0) {
      result.alertsSent += triggerResult.triggered;
    }
  }

  return result;
}

/**
 * POST /api/cron/contract-expiration-alerts
 * Process contract expiration alerts
 */
export async function POST(request: NextRequest) {
  // Verify cron authorization
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

    // Find active contract expiration workflows
    const workflows = await database.emailWorkflow.findMany({
      where: {
        triggerType: "contract_expiration",
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
        message: "No active contract expiration workflows found",
        results,
      });
    }

    // Get unique tenant IDs
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
          `Failed to process contract alerts for tenant ${tenantId}:`,
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
    console.error("Failed to process contract expiration alerts:", error);
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
