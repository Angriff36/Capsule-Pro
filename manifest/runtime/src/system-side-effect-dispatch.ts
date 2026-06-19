import type { CommandResult } from "@angriff36/manifest";
import type { ManifestRuntimeEngine } from "./runtime-engine.js";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

export type SideEffectDispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

/**
 * Dispatch a governed side-effect command as the `system` role so middleware
 * legs (e.g. EventStaffAssigned → Notification.create) are not denied by the
 * downstream entity's default policy when the triggering actor is a
 * coordinator. Identity middleware skips DB role lookup when `role` is preset.
 */
export function createSystemSideEffectDispatch(
  engine: ManifestRuntimeEngine
): SideEffectDispatchCommand {
  return async (commandName, input, options) => {
    const ctx = engine.getContext();
    const prevUser = ctx.user;
    try {
      engine.setContext({
        user: {
          ...(prevUser && typeof prevUser === "object" ? prevUser : {}),
          id:
            (prevUser as { id?: string } | undefined)?.id ??
            "system:side-effect",
          role: "system",
        },
      });
      return await engine.runCommand(commandName, input, options);
    } finally {
      engine.setContext({ user: prevUser });
    }
  };
}
