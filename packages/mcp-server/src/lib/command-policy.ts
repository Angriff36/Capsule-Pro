/**
 * Command access policy for MCP.
 *
 * Three-tier decision model:
 *   DENY (default)  → Command not in policy map → rejected
 *   ALLOW           → Command executes immediately
 *   CONFIRM         → Command returns confirmation prompt; re-invoke with
 *                     confirmation_token to execute
 *
 * Every command is in exactly ONE tier. There is no ambiguity.
 * Commands not in the map are implicitly DENY.
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandAccess = "ALLOW" | "CONFIRM" | "DENY";

// ---------------------------------------------------------------------------
// Policy map
// ---------------------------------------------------------------------------

/**
 * Explicit command access policy.
 *
 * New commands are added via PR review:
 * 1. Developer adds command with appropriate tier
 * 2. PR includes: security review, tenant isolation verification, test coverage
 * 3. Destructive commands MUST use "CONFIRM" tier
 * 4. Default for unlisted commands is always "DENY"
 */
const COMMAND_POLICY = new Map<string, CommandAccess>([
  // ── ALLOW: Safe, non-destructive, well-tested ──

  // Kitchen task lifecycle
  ["PrepTask.claim", "ALLOW"],
  ["PrepTask.unclaim", "ALLOW"],
  ["PrepTask.start", "ALLOW"],
  ["PrepTask.complete", "ALLOW"],
  ["PrepTask.release", "ALLOW"],
  ["KitchenTask.claim", "ALLOW"],
  ["KitchenTask.start", "ALLOW"],
  ["KitchenTask.complete", "ALLOW"],
  ["KitchenTask.release", "ALLOW"],

  // Read-like commands (create drafts, not destructive)
  ["PrepList.create", "ALLOW"],
  ["PrepList.activate", "ALLOW"],

  // CRM (low-risk)
  ["ClientInteraction.create", "ALLOW"],
  ["ClientInteraction.complete", "ALLOW"],

  // ── CONFIRM: Destructive or high-impact, require explicit confirmation ──
  ["Event.cancel", "CONFIRM"],
  ["Event.archive", "CONFIRM"],
  ["PurchaseOrder.cancel", "CONFIRM"],
  ["User.deactivate", "CONFIRM"],
  ["User.terminate", "CONFIRM"],
  ["PrepList.cancel", "CONFIRM"],
  ["CateringOrder.cancel", "CONFIRM"],

  // All other commands: implicitly DENY (not in map)
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the access policy for a command.
 * Returns "DENY" for any command not explicitly in the policy map.
 */
export function getCommandAccess(
  entity: string,
  command: string
): CommandAccess {
  return COMMAND_POLICY.get(`${entity}.${command}`) ?? "DENY";
}

/**
 * Get all commands in the policy map with their access levels.
 * Useful for introspection tools.
 */
export function getAllowedCommands(): Array<{
  entity: string;
  command: string;
  access: CommandAccess;
}> {
  const result: Array<{
    entity: string;
    command: string;
    access: CommandAccess;
  }> = [];

  for (const [key, access] of COMMAND_POLICY) {
    const [entity, command] = key.split(".");
    if (entity && command) {
      result.push({ entity, command, access });
    }
  }

  return result;
}

/**
 * Check if a command is available via MCP (ALLOW or CONFIRM).
 */
export function isCommandAvailable(entity: string, command: string): boolean {
  const access = getCommandAccess(entity, command);
  return access !== "DENY";
}
