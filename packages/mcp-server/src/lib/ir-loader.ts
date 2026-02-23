/**
 * IR loading, caching, and hot-reload for the MCP server.
 *
 * Reuses `loadPrecompiledIR` from `@repo/manifest-adapters` for the actual
 * loading logic. This module adds:
 * - A typed accessor for the cached IR
 * - File watching for hot-reload during development
 * - Summarization helpers for MCP tool responses
 *
 * @packageDocumentation
 */

import { existsSync, watch } from "node:fs";
import { resolve } from "node:path";
import type { IR } from "@angriff36/manifest/ir";
import { loadPrecompiledIR } from "@repo/manifest-adapters/runtime/loadManifests";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_IR_PATH = "packages/manifest-ir/ir/kitchen/kitchen.ir.json";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let cachedIR: IR | null = null;
let watcherActive = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the precompiled IR, using the module-level cache.
 *
 * First call reads from disk; subsequent calls return the cached instance.
 * Call `invalidateIRCache()` or enable the file watcher to refresh.
 */
export function getIR(irPath?: string): IR {
  if (cachedIR) {
    return cachedIR;
  }

  const bundle = loadPrecompiledIR(irPath ?? DEFAULT_IR_PATH);
  cachedIR = bundle.ir;
  return cachedIR;
}

/** Invalidate the cached IR so the next `getIR()` call reloads from disk. */
export function invalidateIRCache(): void {
  cachedIR = null;
}

/**
 * Start watching the IR file for changes and auto-invalidate the cache.
 *
 * This enables hot-reload during development — when manifests are recompiled,
 * the MCP server picks up the new IR on the next tool call.
 */
export function startIRWatcher(irPath?: string): void {
  if (watcherActive) {
    return;
  }

  const relPath = irPath ?? DEFAULT_IR_PATH;

  // Resolve from monorepo root (same strategy as loadPrecompiledIR)
  let absPath: string;
  try {
    // loadPrecompiledIR resolves from repo root internally;
    // we need the same path for the watcher
    absPath = resolveFromRepoRoot(relPath);
  } catch {
    // If we can't find the repo root, skip watching
    return;
  }

  if (!existsSync(absPath)) {
    return;
  }

  watch(absPath, () => {
    invalidateIRCache();
  });

  watcherActive = true;
}

// ---------------------------------------------------------------------------
// IR query helpers (used by plugins)
// ---------------------------------------------------------------------------

/** Get all entity names from the IR. */
export function getEntityNames(): string[] {
  const ir = getIR();
  return (ir.entities ?? []).map((e) => e.name).sort();
}

/** Get a specific entity definition from the IR. */
export function getEntity(name: string): IR["entities"][number] | undefined {
  const ir = getIR();
  return (ir.entities ?? []).find((e) => e.name === name);
}

/** Get all command definitions from the IR. */
export function getCommands(): IR["commands"] {
  const ir = getIR();
  return ir.commands ?? [];
}

/** Get commands for a specific entity. */
export function getCommandsForEntity(entityName: string): IR["commands"] {
  return getCommands().filter((c) => c.entity === entityName);
}

/** Get a specific command definition. */
export function getCommand(
  entityName: string,
  commandName: string
): IR["commands"][number] | undefined {
  return getCommands().find(
    (c) => c.entity === entityName && c.name === commandName
  );
}

/** Get all event definitions from the IR. */
export function getEvents(): IR["events"] {
  const ir = getIR();
  return ir.events ?? [];
}

/** Get all policy definitions from the IR (admin only). */
export function getPolicies(): IR["policies"] {
  const ir = getIR();
  return ir.policies ?? [];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walk up from cwd to find the monorepo root (pnpm-workspace.yaml),
 * then resolve the given relative path from there.
 */
function resolveFromRepoRoot(relPath: string): string {
  let dir = process.cwd();
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return resolve(dir, relPath);
    }
    const parent = resolve(dir, "..");
    if (parent === dir) {
      throw new Error("Could not find monorepo root (pnpm-workspace.yaml)");
    }
    dir = parent;
  }
}
