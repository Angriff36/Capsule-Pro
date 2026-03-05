/**
 * POST /api/cron/vendor-contract-lifecycle
 *
 * Cron endpoint to manage vendor contract lifecycle including:
 * - Auto-renewal processing
 * - Expiration alerts
 * - Compliance monitoring
 *
 * This should be called daily by a cron scheduler.
 */

import { database } from "@repo/database";
import {
  buildContractRecipients,
  buildVendorContractData,
  triggerEmailWorkflows,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface VendorContractConfig {
  expirationWarningDays: number;
  renewalWarningDays: number;
  complianceReviewDays: number;
}

const DEFAULT_CONFIG: VendorContractConfig = {
  expirationWarningDays: 30,
  renewalWarningDays: 60,
  complianceReviewDays: 90,
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
): Promise<VendorContractConfig> {
  try {
    const body = await request.json();
    const config = { ...DEFAULT_CONFIG };

    if (body.expirationWarningDays) {
      config.expirationWarningDays = Math.max(
        Number(body.expirationWarningDays),
        1
      );
    }
    if (body.renewalWarningDays) {
      config.renewalWarningDays = Math.max(Number(body.renewalWarningDays), 1);
    }
    if (body.complianceReviewDays) {
      config.complianceReviewDays = Math.max(
        Number(body.complianceReviewDays),
        30
      );
    }

    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function processExpiringContracts(
  tenantId: string,
  config: VendorContractConfig
): Promise<{ processed: number; alertsSent: number }> {
  const result = { processed: 0, alertsSent: 0 };

  const now = new Date();
  const expirationWindow = new Date();
  expirationWindow.setDate(now.getDate() + config.expirationWarningDays);

  const contracts = await database.vendorContract.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: "active",
      endDate: {
        gte: now,
        lte: expirationWindow,
      },
    },
  });

  for (const contract of contracts) {
    result.processed++;

    const triggerResult = await triggerEmailWorkflows(database, {
      tenantId,
      triggerType: "vendor_contract_expiring",
      entity: {
        id: contract.id,
        type: "vendor_contract",
      },
      templateData: buildVendorContractData({
        contractNumber: contract.contractNumber,
        vendorName: contract.vendorName,
        contractType: contract.contractType,
        endDate: contract.endDate,
        autoRenew: contract.autoRenew,
        complianceScore: contract.complianceScore,
      }),
      recipients: buildContractRecipients({
        client_email: null,
        client_first_name: contract.vendorName,
        client_last_name: "",
        client_id: contract.vendorId,
      }),
    });

    if (triggerResult.triggered > 0) {
      result.alertsSent += triggerResult.triggered;
    }
  }

  return result;
}

async function processRenewalDueContracts(
  tenantId: string,
  config: VendorContractConfig
): Promise<{ processed: number; alertsSent: number }> {
  const result = { processed: 0, alertsSent: 0 };

  const now = new Date();
  const renewalWindow = new Date();
  renewalWindow.setDate(now.getDate() + config.renewalWarningDays);

  const contracts = await database.vendorContract.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: "active",
      autoRenew: true,
      endDate: {
        gte: now,
        lte: renewalWindow,
      },
    },
  });

  for (const contract of contracts) {
    result.processed++;

    const newEndDate = new Date(contract.endDate);
    newEndDate.setDate(newEndDate.getDate() + contract.renewalTermDays);

    await triggerEmailWorkflows(database, {
      tenantId,
      triggerType: "vendor_contract_renewal_due",
      entity: {
        id: contract.id,
        type: "vendor_contract",
      },
      templateData: {
        ...buildVendorContractData({
          contractNumber: contract.contractNumber,
          vendorName: contract.vendorName,
          contractType: contract.contractType,
          endDate: contract.endDate,
          autoRenew: contract.autoRenew,
        }),
        currentEndDate: contract.endDate?.toISOString(),
        proposedEndDate: newEndDate.toISOString(),
        renewalTermDays: contract.renewalTermDays,
      },
      recipients: buildContractRecipients({
        client_email: null,
        client_first_name: contract.vendorName,
        client_last_name: "",
        client_id: contract.vendorId,
      }),
    });

    result.alertsSent++;
  }

  return result;
}

async function processComplianceReview(
  tenantId: string,
  config: VendorContractConfig
): Promise<{ processed: number; alertsSent: number }> {
  const result = { processed: 0, alertsSent: 0 };

  const now = new Date();
  const reviewThreshold = new Date();
  reviewThreshold.setDate(now.getDate() - config.complianceReviewDays);

  const contracts = await database.vendorContract.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: "active",
      lastComplianceReview: {
        lt: reviewThreshold,
      },
    },
  });

  for (const contract of contracts) {
    result.processed++;

    if (contract.complianceScore < 70) {
      await triggerEmailWorkflows(database, {
        tenantId,
        triggerType: "vendor_contract_compliance",
        entity: {
          id: contract.id,
          type: "vendor_contract",
        },
        templateData: buildVendorContractData({
          contractNumber: contract.contractNumber,
          vendorName: contract.vendorName,
          contractType: contract.contractType,
          complianceScore: contract.complianceScore,
          slaBreachCount: contract.slaBreachCount,
        }),
        recipients: buildContractRecipients({
          client_email: null,
          client_first_name: contract.vendorName,
          client_last_name: "",
          client_id: contract.vendorId,
        }),
      });

      result.alertsSent++;
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    expiring: { processed: 0, alertsSent: 0 },
    renewalDue: { processed: 0, alertsSent: 0 },
    compliance: { processed: 0, alertsSent: 0 },
    errors: [] as string[],
  };

  try {
    const config = await parseConfig(request);

    const workflows = await database.emailWorkflow.findMany({
      where: {
        triggerType: {
          in: [
            "vendor_contract_expiring",
            "vendor_contract_renewal_due",
            "vendor_contract_compliance",
          ],
        },
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
        message: "No active vendor contract lifecycle workflows found",
        results,
      });
    }

    const tenantIds = [...new Set(workflows.map((w) => w.tenantId))];

    for (const tenantId of tenantIds) {
      try {
        const [expiringResult, renewalResult, complianceResult] =
          await Promise.all([
            processExpiringContracts(tenantId, config),
            processRenewalDueContracts(tenantId, config),
            processComplianceReview(tenantId, config),
          ]);

        results.expiring.processed += expiringResult.processed;
        results.expiring.alertsSent += expiringResult.alertsSent;
        results.renewalDue.processed += renewalResult.processed;
        results.renewalDue.alertsSent += renewalResult.alertsSent;
        results.compliance.processed += complianceResult.processed;
        results.compliance.alertsSent += complianceResult.alertsSent;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Tenant ${tenantId}: ${message}`);
        console.error(
          `Failed to process vendor contract lifecycle for tenant ${tenantId}:`,
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
    console.error("Failed to process vendor contract lifecycle:", error);
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
