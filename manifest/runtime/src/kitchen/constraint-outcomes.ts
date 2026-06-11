/**
 * Constraint Outcomes and Override Utilities
 *
 * Constraint handling, override management, and UI formatting
 */

import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import type { OverrideRequest } from "@angriff36/manifest/ir";

/**
 * Override reason codes for constraint overrides
 * These are application-specific reasons for authorizing constraint overrides
 */
export const OVERRIDE_REASON_CODES = {
  customer_request: "Customer Request",
  equipment_failure: "Equipment Failure",
  time_crunch: "Time Crunch",
  substitution: "Substitution Available",
  staffing_gap: "Staffing Gap",
  other: "Other",
} as const;

export type OverrideReasonCode = keyof typeof OVERRIDE_REASON_CODES;

/**
 * Severity level for constraint outcomes
 */
export type ConstraintSeverity = "ok" | "warn" | "block";

/**
 * Check if a constraint outcome requires user attention
 */
export function isConstraintActionable(outcome: ConstraintOutcome): boolean {
  return (
    !outcome.passed &&
    (outcome.severity === "warn" || outcome.severity === "block")
  );
}

/**
 * Check if any constraints in the array require attention
 */
export function hasActionableConstraints(
  outcomes: ConstraintOutcome[] | undefined
): boolean {
  if (!outcomes || outcomes.length === 0) {
    return false;
  }
  return outcomes.some(isConstraintActionable);
}

/**
 * Get only the actionable (failed) constraints
 */
export function getActionableConstraints(
  outcomes: ConstraintOutcome[] | undefined
): ConstraintOutcome[] {
  if (!outcomes) {
    return [];
  }
  return outcomes.filter(isConstraintActionable);
}

/**
 * Get constraints that are blocking (failed with BLOCK severity)
 */
export function getBlockingConstraints(
  outcomes: ConstraintOutcome[] | undefined
): ConstraintOutcome[] {
  if (!outcomes) {
    return [];
  }
  return outcomes.filter((o) => !o.passed && o.severity === "block");
}

/**
 * Get constraints that are warnings (failed with WARN severity)
 */
export function getWarningConstraints(
  outcomes: ConstraintOutcome[] | undefined
): ConstraintOutcome[] {
  if (!outcomes) {
    return [];
  }
  return outcomes.filter((o) => !o.passed && o.severity === "warn");
}

/**
 * Check if command can proceed (no blocking constraints or all blocking constraints are overridden)
 */
export function canProceedWithConstraints(
  outcomes: ConstraintOutcome[] | undefined
): boolean {
  if (!outcomes || outcomes.length === 0) {
    return true;
  }
  const blocking = getBlockingConstraints(outcomes);
  if (blocking.length === 0) {
    return true;
  }
  return blocking.every((o) => o.overridden);
}

/**
 * Create an override request for a constraint
 */
export function createOverrideRequest(
  constraintCode: string,
  reason: string,
  authorizedBy: string
): OverrideRequest {
  return {
    constraintCode,
    reason,
    authorizedBy,
    timestamp: Date.now(),
  };
}

/**
 * Format constraint outcome for display
 */
export function formatConstraintOutcome(outcome: ConstraintOutcome): {
  title: string;
  description: string;
  severity: "default" | "warning" | "destructive";
  details: Record<string, string>;
} {
  const severityLabels: Record<ConstraintSeverity, string> = {
    ok: "Info",
    warn: "Warning",
    block: "Blocked",
  };

  const severityStyles: Record<
    ConstraintSeverity,
    "default" | "warning" | "destructive"
  > = {
    ok: "default",
    warn: "warning",
    block: "destructive",
  };

  const title =
    outcome.message ||
    `${severityLabels[outcome.severity as ConstraintSeverity]}: ${outcome.constraintName}`;
  const description = outcome.formatted;

  const details: Record<string, string> = {};
  if (outcome.details) {
    for (const [key, value] of Object.entries(outcome.details)) {
      details[key] = String(value);
    }
  }
  if (outcome.resolved) {
    for (const r of outcome.resolved) {
      details[r.expression] = String(r.value);
    }
  }

  return {
    title,
    description,
    severity: severityStyles[outcome.severity as ConstraintSeverity],
    details,
  };
}

/**
 * Extended command result with constraint outcome helpers
 */
export interface CommandResultWithConstraints<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  deniedBy?: string;
  guardFailure?: {
    index: number;
    expression: string;
    formatted: string;
    resolved?: Array<{ expression: string; value: unknown }>;
  };
  policyDenial?: {
    policyName: string;
    message?: string;
    resolved?: Array<{ expression: string; value: unknown }>;
  };
  constraintOutcomes?: ConstraintOutcome[];
  overrideRequests?: OverrideRequest[];
  concurrencyConflict?: {
    entityType: string;
    entityId: string;
    expectedVersion: number;
    actualVersion: number;
    conflictCode: string;
  };
  emittedEvents: Array<{
    name: string;
    channel: string;
    payload: unknown;
    timestamp: number;
  }>;
}

/**
 * Parse and format guard failure for UI display
 */
export function formatGuardFailure(
  failure: NonNullable<CommandResultWithConstraints["guardFailure"]>
): {
  title: string;
  description: string;
  values: Array<{ expression: string; value: string }>;
} {
  return {
    title: `Guard Failed (${failure.index})`,
    description: failure.formatted,
    values:
      failure.resolved?.map((r) => ({
        expression: r.expression,
        value: String(r.value),
      })) || [],
  };
}

/**
 * Parse and format policy denial for UI display
 */
export function formatPolicyDenial(
  denial: NonNullable<CommandResultWithConstraints["policyDenial"]>
): {
  title: string;
  description: string;
  values: Array<{ expression: string; value: string }>;
} {
  return {
    title: `Access Denied: ${denial.policyName}`,
    description:
      denial.message || "You don't have permission to perform this action",
    values:
      denial.resolved?.map((r) => ({
        expression: r.expression,
        value: String(r.value),
      })) || [],
  };
}
