/**
 * IR loading, caching, and hot-reload for the MCP server.
 *
 * Loads merged precompiled IR from `manifest/ir/*.ir.json` via
 * `@repo/manifest-runtime` (official @angriff36/manifest IR types).
 */

import { existsSync, readdirSync, watch } from "node:fs";
import { join, resolve } from "node:path";
import type { IR } from "@angriff36/manifest/ir";
import {
  invalidateMergedIRCache,
  loadMergedPrecompiledIR,
} from "@repo/manifest-runtime/runtime/loadManifests";

let cachedIR: IR | null = null;
let cachedSources: string[] = [];
let watcherActive = false;

export function getIR(): IR {
  if (cachedIR) {
    return cachedIR;
  }

  const bundle = loadMergedPrecompiledIR();
  cachedIR = bundle.ir;
  cachedSources = listIrSources();
  return cachedIR;
}

export function listIrSources(): string[] {
  const repoRoot = resolveFromRepoRoot(".");
  const irDir = join(repoRoot, "manifest/ir");
  if (!existsSync(irDir)) {
    return [];
  }

  try {
    return readdirSync(irDir)
      .filter((name) => name.endsWith(".ir.json"))
      .sort()
      .map((name) => `manifest/ir/${name}`);
  } catch {
    return [];
  }
}

export function invalidateIRCache(): void {
  cachedIR = null;
  cachedSources = [];
  invalidateMergedIRCache();
}

export function startIRWatcher(): void {
  if (watcherActive) {
    return;
  }

  const repoRoot = resolveFromRepoRoot(".");
  const irDir = join(repoRoot, "manifest/ir");
  if (!existsSync(irDir)) {
    return;
  }

  watch(irDir, () => {
    invalidateIRCache();
  });

  watcherActive = true;
}

export function getEntityNames(): string[] {
  const ir = getIR();
  return (ir.entities ?? []).map((entity) => entity.name).sort();
}

export function getEntity(name: string): IR["entities"][number] | undefined {
  const ir = getIR();
  return (ir.entities ?? []).find((entity) => entity.name === name);
}

export function getCommands(): IR["commands"] {
  const ir = getIR();
  return ir.commands ?? [];
}

export function getCommandsForEntity(entityName: string): IR["commands"] {
  return getCommands().filter((command) => command.entity === entityName);
}

export function getCommand(
  entityName: string,
  commandName: string
): IR["commands"][number] | undefined {
  return getCommands().find(
    (command) => command.entity === entityName && command.name === commandName
  );
}

export function getEvents(): IR["events"] {
  const ir = getIR();
  return ir.events ?? [];
}

export function getPolicies(): IR["policies"] {
  const ir = getIR();
  return ir.policies ?? [];
}

function resolveFromRepoRoot(relPath: string): string {
  let dir = process.env.MCP_PROJECT_ROOT || process.cwd();
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return resolve(dir, relPath === "." ? "" : relPath);
    }
    const parent = resolve(dir, "..");
    if (parent === dir) {
      throw new Error("Could not find monorepo root (pnpm-workspace.yaml)");
    }
    dir = parent;
  }
}

export { cachedSources as _cachedSourcesForTests };
