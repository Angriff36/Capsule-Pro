/**
 * Shared types for the Capsule-Pro MCP server.
 *
 * @packageDocumentation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Resolved identity for the current MCP session. */
export interface McpIdentity {
  mode: "service-account" | "user-delegated";
  roles: string[];
  tenantId: string;
  userId: string;
}

// ---------------------------------------------------------------------------
// Server mode
// ---------------------------------------------------------------------------

/**
 * MCP server trust level.
 *
 * - `tenant`: Tenant-scoped tools (read + allowlisted writes). Default.
 * - `admin`: Full IR introspection, policies, devops, monitoring. Local dev only.
 */
export type ServerMode = "tenant" | "admin";

/** Transport mode determines how identity is resolved. */
export type TransportMode = "stdio" | "http";

// ---------------------------------------------------------------------------
// Plugin system
// ---------------------------------------------------------------------------

/** Context available to all plugins during registration. */
export interface PluginContext {
  /** Resolved identity for the current session. */
  identity: McpIdentity;
  /** Server trust level. */
  mode: ServerMode;
  /** The MCP server instance to register tools/resources on. */
  server: McpServer;
}

/**
 * Plugin interface for extending the MCP server.
 *
 * Each plugin registers tools, resources, or prompts on the server.
 * Plugins are loaded based on server mode and configuration.
 */
export interface McpPlugin {
  /** Unique plugin name. */
  name: string;
  /** Register tools/resources on the server. */
  register(ctx: PluginContext): void | Promise<void>;
  /** Semantic version. */
  version: string;
}

// ---------------------------------------------------------------------------
// IR types (lightweight re-exports for plugin use)
// ---------------------------------------------------------------------------

/** Minimal IR entity shape for MCP tool responses. */
export interface IrEntitySummary {
  commands: string[];
  computedProperties: string[];
  constraints: Array<{
    name: string;
    severity: string;
    message: string;
  }>;
  name: string;
  properties: Array<{
    name: string;
    type: string;
    required: boolean;
    nullable: boolean;
  }>;
}

/** Minimal IR command shape for MCP tool responses. */
export interface IrCommandSummary {
  constraints: Array<{
    name: string;
    severity: string;
    message: string;
  }>;
  emits: string[];
  entity: string;
  guards: Array<{
    expression: string;
    message: string;
  }>;
  name: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
}
