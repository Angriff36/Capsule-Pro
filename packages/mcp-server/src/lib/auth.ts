/**
 * Identity resolution for MCP context.
 *
 * Trust boundaries are ENFORCED by transport mode:
 * - "stdio" transport → service-account mode (env vars)
 * - "http" transport  → user-delegated mode (Clerk JWT) — Phase 2+
 *
 * @packageDocumentation
 */

import { keys } from "../keys.js";
import type { McpIdentity, TransportMode } from "../types.js";

/**
 * Resolve identity for the current MCP request.
 *
 * Stdio transport requires MCP_SERVICE_ACCOUNT_ID and MCP_SERVICE_TENANT_ID.
 * Optional MCP_SERVICE_ACCOUNT_ROLE supplies the role list (comma-separated).
 */
export async function resolveIdentity(
  transport: TransportMode
): Promise<McpIdentity> {
  if (transport === "stdio") {
    return resolveStdioIdentity();
  }

  throw new Error(
    "HTTP transport identity resolution not yet implemented. Use stdio transport for Phase 1."
  );
}

function resolveStdioIdentity(): McpIdentity {
  const {
    MCP_SERVICE_ACCOUNT_ID: accountId,
    MCP_SERVICE_TENANT_ID: tenantId,
    MCP_SERVICE_ACCOUNT_ROLE: roleCsv,
  } = keys();

  if (!accountId || !tenantId) {
    throw new Error(
      "MCP identity requires MCP_SERVICE_ACCOUNT_ID and MCP_SERVICE_TENANT_ID. " +
        "Set both in .env.local (Convex clone — no Prisma auto-discovery)."
    );
  }

  const roles = roleCsv
    ? roleCsv
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
    : [];

  return {
    userId: accountId,
    tenantId,
    roles,
    mode: "service-account",
  };
}
