#!/usr/bin/env node

/**
 * Shared config reader for manifest.config.yaml
 *
 * Both generate.mjs and compile.mjs import from this module to get paths
 * from a single source of truth instead of hardcoding them.
 *
 * The YAML format is simple enough (no anchors, aliases, or complex types)
 * that a lightweight regex-based parse is sufficient — no js-yaml dependency.
 *
 * @see manifest.config.yaml — the canonical configuration file
 * @see https://manifest-b1e8623f.mintlify.app/cli/configuration
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const CONFIG_PATH = join(repoRoot, "manifest.config.yaml");

// ---------------------------------------------------------------------------
// Minimal YAML parser (stack-based, handles arbitrary nesting depth)
// ---------------------------------------------------------------------------

/**
 * Parse the subset of YAML used by manifest.config.yaml.
 * Handles: nested mappings at arbitrary depth, scalars, comments, blank lines.
 * Does NOT handle: arrays, anchors, multiline strings, flow collections.
 *
 * Uses an indent stack to track nesting: each mapping push adds a frame,
 * and we pop frames when the indent decreases.
 */
function parseSimpleYaml(text) {
  const root = {};
  // Stack of { indent, container } — tracks which object receives key-value pairs
  const stack = [{ indent: -1, container: root }];

  for (const rawLine of text.split("\n")) {
    // Strip comments (our config has no quoted strings with #)
    const line = rawLine.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) {
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // Pop stack until we find the parent whose indent is strictly less than ours
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const kvMatch = trimmed.match(/^([\w][\w.-]*):\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }

    const [, key, rawVal] = kvMatch;
    const val = rawVal.trim();
    const parent = stack[stack.length - 1].container;

    if (val === "" || val === undefined) {
      // Mapping — push a new frame so children go into this sub-object
      parent[key] = parent[key] || {};
      stack.push({ indent, container: parent[key] });
    } else {
      parent[key] = parseScalar(val);
    }
  }
  return root;
}

function parseScalar(val) {
  if (val === "true") {
    return true;
  }
  if (val === "false") {
    return false;
  }
  if (/^\d+$/.test(val)) {
    return Number.parseInt(val, 10);
  }
  if (/^\d+\.\d+$/.test(val)) {
    return Number.parseFloat(val);
  }
  // Strip surrounding quotes if present
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    return val.slice(1, -1);
  }
  return val;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _config = null;

/**
 * Read and parse manifest.config.yaml (cached after first call).
 */
export function readConfig() {
  if (_config) {
    return _config;
  }

  if (!existsSync(CONFIG_PATH)) {
    console.warn(`[read-config] ${CONFIG_PATH} not found — using defaults.`);
    _config = {};
    return _config;
  }

  const raw = readFileSync(CONFIG_PATH, "utf-8");
  _config = parseSimpleYaml(raw);
  return _config;
}

/**
 * Derived paths from config — the values scripts actually need.
 * All paths are absolute (resolved from repo root).
 */
export function getConfigPaths() {
  const cfg = readConfig();

  // Config values (with sensible defaults matching current hardcoded values)
  const srcGlob = cfg.src || "manifest/source/**/*.manifest";
  const outputDir = cfg.output || "manifest/ir/";
  const prismaSchema =
    cfg.prismaSchema || "packages/database/prisma/schema.prisma";

  // Derive source directory from glob (strip the glob portion)
  const srcDir = srcGlob.replace(/\/?\*\*\/\*\.manifest$/, "");

  // Projection config
  const projections = cfg.projections || {};
  const nextjs = projections.nextjs || {};
  const nextjsOptions = nextjs.options || {};
  const nextjsOutput = nextjs.output || "apps/api/app/api/";

  // App Router base directory (schema key: projections.nextjs.options.appDir).
  // generate.mjs uses this for the staged-route path prefix instead of a literal.
  const appDir = nextjsOptions.appDir || "apps/api/app/api";

  // Direct DB read-route policy (schema key: projections.nextjs.options.readRoutes).
  // enabled:false suppresses list/detail read-route generation.
  const readRoutes = nextjsOptions.readRoutes || {};
  const readRoutesEnabled = readRoutes.enabled !== false; // default true
  const readRoutesDirectDbReads = readRoutes.directDbReads !== false; // default true

  // Canonical Routes projection base path (schema key: projections.routes.options.basePath).
  const routesProjection = projections.routes || {};
  const routesOptions = routesProjection.options || {};
  const routesBasePath = routesOptions.basePath || "/api";

  // Canonical command dispatcher route. The official schema key is
  // projections.nextjs.options.dispatcher.path; keep a legacy nextjs.dispatcher
  // fallback and a hardcoded default so generation still works with no config.
  const dispatcher = nextjsOptions.dispatcher || {};
  const nextjsDispatcher =
    dispatcher.path ||
    nextjs.dispatcher ||
    "apps/api/app/api/manifest/[entity]/commands/[command]/route.ts";

  // Executor the generated dispatcher delegates to. These drive the hand-written
  // dispatcher template's import + call in generate.mjs (defaults = the real module).
  const dispatcherExecutorImportPath =
    dispatcher.executorImportPath || "@/lib/manifest/execute-command";
  const dispatcherExecutorImportName =
    dispatcher.executorImportName || "runManifestCommand";

  // IR file names (project-specific, not configurable — kitchen.* naming is Capsule's convention)
  const irFile = join(outputDir, "kitchen.ir.json");
  const commandsFile = join(outputDir, "kitchen.commands.json");

  // Registry
  const registryDir = "manifest/runtime";
  const registryFile = join(registryDir, "commands.registry.json");

  return {
    // Absolute paths
    repoRoot,
    srcDir: resolve(repoRoot, srcDir),
    outputDir: resolve(repoRoot, outputDir),
    prismaSchema: resolve(repoRoot, prismaSchema),
    irPath: resolve(repoRoot, irFile),
    commandsPath: resolve(repoRoot, commandsFile),
    registryDir: resolve(repoRoot, registryDir),
    registryPath: resolve(repoRoot, registryFile),
    nextjsOutput: resolve(repoRoot, nextjsOutput),
    dispatcherPath: resolve(repoRoot, nextjsDispatcher),
    dispatcherDir: resolve(repoRoot, dirname(nextjsDispatcher)),

    // App Router base prefix (string, normalized with a trailing slash) — consumed by
    // generate.mjs to strip the staged-route prefix the CLI emits.
    appDirPrefix: `${appDir.replace(/\/+$/, "")}/`,

    // Read-route generation policy.
    readRoutesEnabled,
    readRoutesDirectDbReads,

    // Canonical Routes projection base path.
    routesBasePath,

    // Dispatcher executor import (consumed by generate.mjs's dispatcher template).
    dispatcherExecutorImportPath,
    dispatcherExecutorImportName,

    // Raw config for projection options etc.
    config: cfg,
    projections,
  };
}

// Allow scripts to call this directly for a quick config dump
if (
  process.argv[1] &&
  process.argv[1].endsWith("read-config.mjs") &&
  process.argv.includes("--dump")
) {
  const paths = getConfigPaths();
  console.log(JSON.stringify(paths, null, 2));
}
