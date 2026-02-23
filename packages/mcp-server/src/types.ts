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
  userId: string;
  tenantId: string;
  roles: string[];
  mode: "service-account" | "user-delegated";
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
  /** The MCP server instance to register tools/resources on. */
  server: McpServer;
  /** Resolved identity for the current session. */
  identity: McpIdentity;
  /** Server trust level. */
  mode: ServerMode;
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
  /** Semantic version. */
  version: string;
  /** Register tools/resources on the server. */
  register(ctx: PluginContext): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// IR types (lightweight re-exports for plugin use)
// ---------------------------------------------------------------------------

/** Minimal IR entity shape for MCP tool responses. */
export interface IrEntitySummary {
  name: string;
  properties: Array<{
    name: string;
    type: string;
    required: boolean;
    nullable: boolean;
  }>;
  computedProperties: string[];
  commands: string[];
  constraints: Array<{
    name: string;
    severity: string;
    message: string;
  }>;
}

/** Minimal IR command shape for MCP tool responses. */
export interface IrCommandSummary {
  name: string;
  entity: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  guards: Array<{
    expression: string;
    message: string;
  }>;
  constraints: Array<{
    name: string;
    severity: string;
    message: string;
  }>;
  emits: string[];
}
