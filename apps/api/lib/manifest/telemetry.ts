import type { CommandResult } from "@angriff36/manifest";
import type {
  ConstraintOutcome,
  IRCommand,
  IRConstraint,
  OverrideRequest,
} from "@angriff36/manifest/ir";
import * as Sentry from "@sentry/nextjs";

/**
 * Telemetry hooks for Manifest runtime observability.
 *
 * These hooks fire during command execution to provide Sentry metrics
 * for constraint evaluations, override authorizations, and command outcomes.
 * Wired centrally in createManifestRuntime() so all command routes
 * get observability without per-route changes.
 */
export interface ManifestTelemetryHooks {
  onConstraintEvaluated?: (
    outcome: Readonly<ConstraintOutcome>,
    commandName: string,
    entityName?: string
  ) => void;

  onOverrideApplied?: (
    constraint: Readonly<IRConstraint>,
    overrideReq: Readonly<OverrideRequest>,
    outcome: Readonly<ConstraintOutcome>,
    commandName: string
  ) => void;

  onCommandExecuted?: (
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ) => void | Promise<void>;
}

/**
 * Creates Sentry-integrated telemetry hooks for the Manifest runtime.
 *
 * Metrics emitted:
 * - `manifest.constraint.evaluated` - Non-ok constraint evaluations (block/warn)
 * - `manifest.override.applied` - Constraint overrides authorized by users
 * - `manifest.command.executed` - All command executions (success + failure)
 * - `manifest.command.failed` - Failed command executions
 * - `manifest.constraint.blocked` - Blocking constraint violations
 * - `manifest.constraint.warned` - Warning constraint violations
 */
export function createSentryTelemetry(): ManifestTelemetryHooks {
  return {
    onConstraintEvaluated(outcome, commandName, entityName) {
      // Only emit metrics for non-ok constraints to reduce noise
      if (outcome.severity === "ok") {
        return;
      }

      Sentry.metrics.count("manifest.constraint.evaluated", 1, {
        attributes: {
          severity: outcome.severity,
          passed: String(outcome.passed),
          overridden: String(outcome.overridden ?? false),
          entity: entityName ?? "unknown",
          command: commandName,
        },
      });
    },

    onOverrideApplied(constraint, _overrideReq, outcome, commandName) {
      Sentry.metrics.count("manifest.override.applied", 1, {
        attributes: {
          constraint_code: constraint.code ?? "unknown",
          severity: outcome.severity,
          command: commandName,
        },
      });

      Sentry.addBreadcrumb({
        category: "manifest.override",
        message: `Override applied for ${constraint.code ?? "unknown"} on ${commandName}`,
        level: "warning",
        data: {
          constraintCode: constraint.code,
          severity: outcome.severity,
          command: commandName,
        },
      });
    },

    onCommandExecuted(command, result, entityName) {
      const entity = entityName ?? "unknown";

      Sentry.metrics.count("manifest.command.executed", 1, {
        attributes: {
          entity,
          command: command.name,
          success: String(result.success),
        },
      });

      if (!result.success) {
        Sentry.metrics.count("manifest.command.failed", 1, {
          attributes: {
            entity,
            command: command.name,
          },
        });
      }

      // Count blocking and warning constraints from the result
      if (result.constraintOutcomes && result.constraintOutcomes.length > 0) {
        const blocked = result.constraintOutcomes.filter(
          (o) => !(o.passed || o.overridden) && o.severity === "block"
        ).length;
        const warned = result.constraintOutcomes.filter(
          (o) => !o.passed && o.severity === "warn"
        ).length;

        if (blocked > 0) {
          Sentry.metrics.count("manifest.constraint.blocked", blocked, {
            attributes: { entity, command: command.name },
          });
        }

        if (warned > 0) {
          Sentry.metrics.count("manifest.constraint.warned", warned, {
            attributes: { entity, command: command.name },
          });
        }
      }
    },
  };
}
