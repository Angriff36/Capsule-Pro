import type { ManifestTelemetryHooks } from "./telemetry";

/** Persistent issue log hooks — complements Sentry metrics in dev. */
export function createIssueLogTelemetry(): ManifestTelemetryHooks {
  return {
    // Command failures are logged in execute-command with HTTP status context.
    // Constraint blocks during evaluation are logged there on final failure too.
  };
}

export function mergeTelemetryHooks(
  ...hooks: Array<ManifestTelemetryHooks | undefined>
): ManifestTelemetryHooks {
  return {
    onConstraintEvaluated(outcome, commandName, entityName) {
      for (const hook of hooks) {
        hook?.onConstraintEvaluated?.(outcome, commandName, entityName);
      }
    },
    onOverrideApplied(constraint, overrideReq, outcome, commandName) {
      for (const hook of hooks) {
        hook?.onOverrideApplied?.(
          constraint,
          overrideReq,
          outcome,
          commandName
        );
      }
    },
    onCommandExecuted(command, result, entityName) {
      for (const hook of hooks) {
        void hook?.onCommandExecuted?.(command, result, entityName);
      }
    },
  };
}
