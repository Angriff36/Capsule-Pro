/**
 * Payment Reconciliation Service
 *
 * Handles matching payments to invoices, detecting discrepancies,
 * and managing the reconciliation workflow
 */

import { db } from "@capsule-db";

/**
 * Reconciliation status types
 */
export type ReconciliationStatus =
  | "PENDING"
  | "MATCHED"
  | "UNMATCHED"
  | "MANUAL_REVIEW"
  | "DISCREPANCY"
  | "RESOLVED";

export type ReconciliationType = "AUTO" | "MANUAL" | "BATCH";

/**
 * Payment gateway webhook data structure
 */
export interface GatewayWebhookData {
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  processor: string;
  feeAmount?: number;
  netAmount?: number;
  timestamp: Date;
  rawResponse: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Match result from auto-matching
 */
export interface MatchResult {
  matched: boolean;
  invoiceId?: string;
  confidence: number;
  reason?: string;
}

/**
 * Create a new reconciliation record
 */
export async function createReconciliation(params: {
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  gatewayTransactionId?: string;
  type?: ReconciliationType;
}) {
  return db.paymentReconciliation.create({
    data: {
      tenantId: params.tenantId,
      paymentId: params.paymentId,
      invoiceId: params.invoiceId,
      gatewayTransactionId: params.gatewayTransactionId,
      type: params.type || "AUTO",
      reconciliationDate: new Date(),
      status: "PENDING",
      expectedAmount: 0,
      actualAmount: 0,
    },
  });
}

/**
 * Attempt to automatically match a payment to an invoice
 */
export async function autoMatchPayment(params: {
  tenantId: string;
  paymentId: string;
  gatewayData: GatewayWebhookData;
}): Promise<MatchResult> {
  // Get the payment
  const payment = await db.payment.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.paymentId,
      deletedAt: null,
    },
  });

  if (!payment) {
    return { matched: false, confidence: 0, reason: "Payment not found" };
  }

  // Get the invoice
  const invoice = await db.invoice.findFirst({
    where: {
      tenantId: params.tenantId,
      id: payment.invoiceId,
      deletedAt: null,
    },
  });

  if (!invoice) {
    return { matched: false, confidence: 0, reason: "Invoice not found" };
  }

  // Calculate confidence score
  let confidence = 0;
  const reasons: string[] = [];

  // Amount match (highest weight)
  const amountDiff = Math.abs(params.gatewayData.amount - invoice.amountDue);
  if (amountDiff < 0.01) {
    confidence += 50;
  } else if (amountDiff < 1) {
    confidence += 30;
  } else if (amountDiff < invoice.amountDue * 0.05) {
    confidence += 20;
  } else {
    reasons.push("Amount discrepancy detected");
  }

  // Currency match
  if (
    params.gatewayData.currency === invoice.currency ||
    payment.currency === "USD"
  ) {
    confidence += 10;
  }

  // Invoice in payable state
  if (
    ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status)
  ) {
    confidence += 20;
  }

  // Recent invoice (less than 180 days)
  const daysSinceIssued = Math.floor(
    (Date.now() - invoice.issuedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceIssued < 180) {
    confidence += 10;
  }

  // Client ID match
  if (payment.clientId && payment.clientId === invoice.clientId) {
    confidence += 10;
  }

  // Determine match result
  const matchResult: MatchResult = {
    matched: confidence >= 70,
    invoiceId: invoice.id,
    confidence,
  };

  if (reasons.length > 0) {
    matchResult.reason = reasons.join("; ");
  }

  // Create or update reconciliation record
  const existingReconciliation = await db.paymentReconciliation.findFirst({
    where: {
      tenantId: params.tenantId,
      paymentId: params.paymentId,
      deletedAt: null,
    },
  });

  if (existingReconciliation) {
    await db.paymentReconciliation.update({
      where: { id: existingReconciliation.id },
      data: {
        actualAmount: params.gatewayData.amount,
        expectedAmount: invoice.amountDue,
        discrepancyAmount: invoice.amountDue - params.gatewayData.amount,
        confidenceScore: confidence,
        status: confidence >= 70 && amountDiff < 1 ? "MATCHED" : "DISCREPANCY",
        gatewayRawData: params.gatewayData.rawResponse,
        gatewayProcessor: params.gatewayData.processor,
        gatewayFeeAmount: params.gatewayData.feeAmount,
        gatewayNetAmount: params.gatewayData.netAmount,
        matchedBy: "AUTO",
        matchedAt: new Date(),
        reviewRequired: confidence < 70 || amountDiff >= 1,
        reviewReason: matchResult.reason,
      },
    });
  }

  return matchResult;
}

/**
 * Process batch reconciliation for multiple payments
 */
export async function batchReconcile(params: {
  tenantId: string;
  paymentIds: string[];
  batchId: string;
}): Promise<{
  processed: number;
  matched: number;
  discrepancies: number;
  failed: number;
}> {
  let matched = 0;
  let discrepancies = 0;
  let failed = 0;

  for (const paymentId of params.paymentIds) {
    try {
      const payment = await db.payment.findFirst({
        where: {
          tenantId: params.tenantId,
          id: paymentId,
          deletedAt: null,
        },
      });

      if (!payment) {
        failed++;
        continue;
      }

      // For batch processing, use payment amount as actual amount
      const gatewayData: GatewayWebhookData = {
        transactionId: payment.gatewayTransactionId || "",
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        processor: payment.processor || "unknown",
        timestamp: payment.processedAt,
        rawResponse: {},
      };

      const result = await autoMatchPayment({
        tenantId: params.tenantId,
        paymentId,
        gatewayData,
      });

      if (result.matched) {
        matched++;
      } else {
        discrepancies++;
      }

      // Update batch ID
      await db.paymentReconciliation.updateMany({
        where: {
          tenantId: params.tenantId,
          paymentId,
        },
        data: {
          batchId: params.batchId,
        },
      });
    } catch {
      failed++;
    }
  }

  return {
    processed: params.paymentIds.length,
    matched,
    discrepancies,
    failed,
  };
}

/**
 * Get pending reconciliations for review
 */
export async function getPendingReconciliations(params: {
  tenantId: string;
  limit?: number;
}) {
  return db.paymentReconciliation.findMany({
    where: {
      tenantId: params.tenantId,
      status: { in: ["PENDING", "DISCREPANCY", "MANUAL_REVIEW"] },
      deletedAt: null,
    },
    take: params.limit || 50,
    orderBy: {
      reconciliationDate: "asc",
    },
    include: {
      payment: {
        include: {
          invoice: true,
          client: true,
        },
      },
    },
  });
}

/**
 * Resolve a discrepancy
 */
export async function resolveDiscrepancy(params: {
  tenantId: string;
  reconciliationId: string;
  action: string;
  resolvedBy: string;
  notes?: string;
}) {
  return db.paymentReconciliation.update({
    where: {
      tenantId_id: {
        tenantId: params.tenantId,
        id: params.reconciliationId,
      },
    },
    data: {
      status: "RESOLVED",
      resolvedBy: params.resolvedBy,
      resolvedAt: new Date(),
      resolutionAction: params.action,
      resolutionNotes: params.notes,
      reviewRequired: false,
    },
  });
}

/**
 * Get reconciliation statistics
 */
export async function getReconciliationStats(params: { tenantId: string }) {
  const [total, byStatus, pending, todayReconciled] = await Promise.all([
    db.paymentReconciliation.count({
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
      },
    }),
    db.paymentReconciliation.groupBy({
      by: ["status"],
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
      },
      _count: true,
    }),
    db.paymentReconciliation.count({
      where: {
        tenantId: params.tenantId,
        status: { in: ["PENDING", "DISCREPANCY", "MANUAL_REVIEW"] },
        deletedAt: null,
      },
    }),
    db.paymentReconciliation.count({
      where: {
        tenantId: params.tenantId,
        reconciliationDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        status: "MATCHED",
        deletedAt: null,
      },
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    pending,
    todayReconciled,
  };
}
