/**
 * Fraud Detection Service
 *
 * Provides automated fraud detection for payment transactions
 * with configurable rules and scoring algorithms
 */

import { db } from "@capsule-db";

/**
 * Fraud check result
 */
export interface FraudCheckResult {
  status: "PASSED" | "FAILED" | "REVIEW_NEEDED" | "MANUAL_REVIEW";
  score: number;
  reasons: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/**
 * Fraud rule configuration
 */
export interface FraudRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  weight: number; // 0-100, contributes to overall score
  threshold?: number; // Score threshold for this rule
}

/**
 * Default fraud detection rules
 */
export const DEFAULT_FRAUD_RULES: FraudRule[] = [
  {
    id: "amount_threshold",
    name: "High Amount Threshold",
    description: "Flag payments above $10,000",
    enabled: true,
    weight: 30,
    threshold: 10_000,
  },
  {
    id: "velocity_check",
    name: "Payment Velocity",
    description: "Detect rapid successive payments",
    enabled: true,
    weight: 25,
  },
  {
    id: "location_mismatch",
    name: "Location Mismatch",
    description: "Check for suspicious location patterns",
    enabled: true,
    weight: 20,
  },
  {
    id: "card_velocity",
    name: "Card Velocity",
    description: "Check for rapid transactions on same card",
    enabled: true,
    weight: 25,
  },
  {
    id: "new_client_large",
    name: "New Client Large Payment",
    description: "Flag large payments from new clients",
    enabled: true,
    weight: 20,
    threshold: 5000,
  },
  {
    id: "international_risk",
    name: "International Risk",
    description: "Flag high-risk international payments",
    enabled: true,
    weight: 15,
  },
  {
    id: "billing_mismatch",
    name: "Billing Information Mismatch",
    description: "Check for address/zip code mismatches",
    enabled: true,
    weight: 15,
  },
];

/**
 * Calculate fraud risk level from score
 */
function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score < 30) return "LOW";
  if (score < 50) return "MEDIUM";
  if (score < 70) return "HIGH";
  return "CRITICAL";
}

/**
 * Determine fraud status from score
 */
function getFraudStatus(
  score: number
): "PASSED" | "REVIEW_NEEDED" | "MANUAL_REVIEW" {
  if (score < 30) return "PASSED";
  if (score < 60) return "REVIEW_NEEDED";
  return "MANUAL_REVIEW";
}

/**
 * Run fraud detection on a payment
 */
export async function checkPaymentFraud(params: {
  tenantId: string;
  paymentId: string;
  customRules?: FraudRule[];
}): Promise<FraudCheckResult> {
  const rules = customRules || DEFAULT_FRAUD_RULES;
  const reasons: string[] = [];
  let totalScore = 0;

  // Get the payment with related data
  const payment = await db.payment.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.paymentId,
      deletedAt: null,
    },
    include: {
      invoice: {
        include: {
          client: true,
          event: true,
        },
      },
    },
  });

  if (!payment) {
    return {
      status: "FAILED",
      score: 100,
      reasons: ["Payment not found"],
      riskLevel: "CRITICAL",
    };
  }

  const amount = Number(payment.amount);

  // Rule: Amount threshold
  const amountThresholdRule = rules.find((r) => r.id === "amount_threshold");
  if (
    amountThresholdRule?.enabled &&
    amountThresholdRule.threshold &&
    amount > amountThresholdRule.threshold
  ) {
    totalScore += amountThresholdRule.weight;
    reasons.push(
      `High amount transaction ($${amount.toLocaleString()} exceeds $${amountThresholdRule.threshold.toLocaleString()})`
    );
  }

  // Rule: Velocity check (multiple payments in short time)
  const velocityRule = rules.find((r) => r.id === "velocity_check");
  if (velocityRule?.enabled) {
    const recentPayments = await db.payment.count({
      where: {
        tenantId: params.tenantId,
        clientId: payment.clientId || undefined,
        processedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
        deletedAt: null,
      },
    });

    if (recentPayments > 5) {
      totalScore += velocityRule.weight;
      reasons.push(
        `High payment velocity (${recentPayments} payments in last hour)`
      );
    }
  }

  // Rule: Card velocity (same card used rapidly)
  const cardVelocityRule = rules.find((r) => r.id === "card_velocity");
  if (cardVelocityRule?.enabled && payment.gatewayPaymentMethodId) {
    const recentCardPayments = await db.payment.count({
      where: {
        tenantId: params.tenantId,
        gatewayPaymentMethodId: payment.gatewayPaymentMethodId,
        processedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        deletedAt: null,
      },
    });

    if (recentCardPayments > 10) {
      totalScore += cardVelocityRule.weight;
      reasons.push(
        `High card velocity (${recentCardPayments} transactions in 24 hours)`
      );
    }
  }

  // Rule: New client large payment
  const newClientRule = rules.find((r) => r.id === "new_client_large");
  if (newClientRule?.enabled && payment.invoice?.client) {
    const clientAgeDays = Math.floor(
      (Date.now() - payment.invoice.client.createdAt.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (
      clientAgeDays < 30 &&
      newClientRule.threshold &&
      amount > newClientRule.threshold
    ) {
      totalScore += newClientRule.weight;
      reasons.push(
        `Large payment from new client ($${amount.toLocaleString()} from client ${clientAgeDays} days old)`
      );
    }
  }

  // Rule: International risk
  const internationalRule = rules.find((r) => r.id === "international_risk");
  if (internationalRule?.enabled && payment.currency !== "USD") {
    totalScore += internationalRule.weight;
    reasons.push(`International transaction (${payment.currency})`);
  }

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, totalScore);

  return {
    status: getFraudStatus(normalizedScore),
    score: normalizedScore,
    reasons,
    riskLevel: getRiskLevel(normalizedScore),
  };
}

/**
 * Check if payment should be auto-failed
 */
export function shouldFailPayment(result: FraudCheckResult): boolean {
  return result.status === "MANUAL_REVIEW" && result.score >= 70;
}

/**
 * Update payment with fraud check results
 */
export async function updatePaymentFraudStatus(params: {
  tenantId: string;
  paymentId: string;
  fraudResult: FraudCheckResult;
}) {
  const updateData: Record<string, unknown> = {
    fraudStatus: params.fraudResult.status,
    fraudScore: params.fraudResult.score,
    fraudReasons: params.fraudResult.reasons,
  };

  // Auto-fail high-risk payments
  if (shouldFailPayment(params.fraudResult)) {
    updateData.status = "FAILED";
  }

  return db.payment.update({
    where: {
      tenantId_id: {
        tenantId: params.tenantId,
        id: params.paymentId,
      },
    },
    data: updateData,
  });
}

/**
 * Get fraud statistics for a tenant
 */
export async function getFraudStats(params: { tenantId: string }) {
  const [total, byStatus, highRisk, today] = await Promise.all([
    db.payment.count({
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
      },
    }),
    db.payment.groupBy({
      by: ["fraudStatus"],
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
      },
      _count: true,
    }),
    db.payment.count({
      where: {
        tenantId: params.tenantId,
        fraudScore: { gte: 70 },
        deletedAt: null,
      },
    }),
    db.payment.count({
      where: {
        tenantId: params.tenantId,
        processedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        deletedAt: null,
      },
    }),
  ]);

  const avgScore = await db.payment.aggregate({
    where: {
      tenantId: params.tenantId,
      fraudScore: { not: null },
      deletedAt: null,
    },
    _avg: {
      fraudScore: true,
    },
  });

  return {
    total,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.fraudStatus, s._count])
    ),
    highRisk,
    todayProcessed: today,
    averageRiskScore: avgScore._avg.fraudScore || 0,
  };
}

/**
 * Flag a payment method for fraud
 */
export async function flagPaymentMethod(params: {
  tenantId: string;
  paymentMethodId: string;
  reason: string;
}) {
  return db.paymentMethod.update({
    where: {
      tenantId_id: {
        tenantId: params.tenantId,
        id: params.paymentMethodId,
      },
    },
    data: {
      fraudFlagged: true,
      status: "FRAUDULENT",
      metadata: {
        fraudReason: params.reason,
        flaggedAt: new Date().toISOString(),
      },
    },
  });
}

/**
 * Get payments requiring manual review
 */
export async function getPaymentsForReview(params: {
  tenantId: string;
  limit?: number;
}) {
  return db.payment.findMany({
    where: {
      tenantId: params.tenantId,
      fraudStatus: "MANUAL_REVIEW",
      status: { not: "FAILED" },
      deletedAt: null,
    },
    take: params.limit || 50,
    orderBy: {
      processedAt: "desc",
    },
    include: {
      invoice: {
        include: {
          client: true,
        },
      },
      client: true,
    },
  });
}
