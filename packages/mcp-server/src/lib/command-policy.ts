/**
 * Command access policy — the single source of truth shared by the dev MCP
 * surface (packages/mcp-server) and the product AI chat surface
 * (apps/app/app/api/command-board/chat, via a thin re-export).
 *
 * Three-tier decision model:
 *   DENY            → Command is refused; never exposed as a tool, never dispatched.
 *   ALLOW           → Command executes immediately.
 *   CONFIRM         → Destructive/high-impact; executes only after explicit
 *                     confirmation (MCP: re-invoke with confirm=true; chat: a
 *                     confirmation flag supplied by the UI, not the model).
 *
 * The two surfaces differ ONLY in their DEFAULT for commands absent from the map,
 * expressed via `getCommandAccess(entity, command, { defaultAccess })`:
 *   - MCP dev surface (autonomous agent): default DENY — safe by allowlist.
 *   - Chat product surface (per-user Clerk auth + RBAC already enforced at the
 *     dispatcher): default ALLOW, so the CONFIRM/DENY tiers add a governance gate
 *     without gutting the ~1,000 existing command capabilities. See
 *     apps/app/app/api/command-board/chat/command-policy.ts.
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

  // ── DENY: Irreversible actions the assistant must NEVER run, even with
  // confirmation — they belong to a dedicated human workflow. Explicit entries
  // matter for the chat surface (whose default is ALLOW); on the MCP surface
  // these are DENY-by-default anyway, so listing them changes nothing there.
  // This tier is intentionally minimal — extend via PR review (product input).
  ["VendorContract.terminate", "DENY"],

  // All other commands: DENY on the MCP surface, ALLOW on the chat surface
  // (see getCommandAccess `defaultAccess`).
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CommandAccessOptions {
  /**
   * Tier assigned to commands absent from the policy map.
   * MCP dev surface uses "DENY" (the default); the chat product surface passes
   * "ALLOW" so the map only needs to carry the CONFIRM/DENY exceptions.
   */
  defaultAccess?: CommandAccess;
}

/**
 * Get the access policy for a command.
 * Commands not explicitly in the map fall back to `options.defaultAccess`
 * (default "DENY").
 */
export function getCommandAccess(
  entity: string,
  command: string,
  options: CommandAccessOptions = {}
): CommandAccess {
  return (
    COMMAND_POLICY.get(`${entity}.${command}`) ??
    options.defaultAccess ??
    "DENY"
  );
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
    // "Allowed" means invokable — DENY entries are exclusions, not allowances.
    if (access === "DENY") {
      continue;
    }
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
