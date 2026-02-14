import type { CommandResult } from "@manifest/runtime";
import type { IRCommand } from "@manifest/runtime/ir";

export interface ManifestTelemetryHooks {
  onCommandExecuted?: (
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ) => void | Promise<void>;
}

export function createManifestTelemetry(
  hooks: ManifestTelemetryHooks = {}
): ManifestTelemetryHooks {
  return hooks;
}
