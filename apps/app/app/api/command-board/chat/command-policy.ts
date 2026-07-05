/**
 * Chat-surface view of the shared three-tier command policy.
 *
 * The policy MAP itself lives once in packages/mcp-server/src/lib/command-policy.ts
 * (the dev MCP surface's home) and is imported here — NOT duplicated. apps/app
 * does not take a workspace dependency on the dev MCP server, so we reach the
 * pure, dependency-free module by relative path; Turbopack compiles it as an
 * ordinary source file in the module graph (transpilePackages gates only
 * bare-specifier node_modules imports, not relative source).
 *
 * The one thing this surface owns is its DEFAULT: unlisted commands are ALLOW
 * here (per-user Clerk auth + RBAC already govern every dispatch), so the map
 * only needs to carry the CONFIRM (destructive) and DENY (never-for-AI) tiers.
 */

import type { CommandAccess } from "../../../../../../packages/mcp-server/src/lib/command-policy";
import { getCommandAccess } from "../../../../../../packages/mcp-server/src/lib/command-policy";

export type { CommandAccess } from "../../../../../../packages/mcp-server/src/lib/command-policy";

/**
 * Destructive verbs escalate to CONFIRM when the shared map has no explicit
 * entry — 45 `*.remove` commands (plus deletes/soft-deletes) would otherwise
 * ride the chat surface's default-ALLOW with no confirmation step.
 */
const DESTRUCTIVE_COMMAND_RE =
  /^(remove|delete|softDelete|destroy|purge|hardDelete)$/;

/**
 * Resolve the access tier for a command on the chat surface.
 * ALLOW unless the shared map marks it CONFIRM or DENY, except destructive
 * verbs which default to CONFIRM when unlisted.
 */
export function getChatCommandAccess(
  entity: string,
  command: string
): CommandAccess {
  const mapped = getCommandAccess(entity, command, { defaultAccess: "ALLOW" });
  if (mapped === "ALLOW" && DESTRUCTIVE_COMMAND_RE.test(command)) {
    return "CONFIRM";
  }
  return mapped;
}
