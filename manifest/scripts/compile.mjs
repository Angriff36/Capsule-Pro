#!/usr/bin/env node

/**
 * Manifest Compile Script - Merges Multiple Manifests
 *
 * NOTE (2026-06-27): The old "--glob last file wins" bug this script once worked
 * around is FIXED in the stock CLI (Ryan authored the fix — `compileCommand`
 * auto-merges multiple sources into one `.json` output; commit d6d42fc, shipped
 * since v2.10.0, present in the installed 2.18.3). Bare `manifest compile
 * '<glob>' -o kitchen.ir.json` now merges correctly. DO NOT treat the CLI as
 * broken. See canonical/manifest/generation/ir-compilation/README.md.
 *
 * This wrapper is RETAINED not for the merge (now native) but because it also
 * emits sibling artifacts the bare CLI does not: the commands manifest +
 * registry, provenance, merge report, and module graph. Verify bare-CLI parity
 * before retiring it.
 *
 * All manifests are compiled and merged into manifest/ir/kitchen.ir.json
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  access as accessAsync,
  readFile as readFileAsync,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import {
  compileToIR,
  validateCommandIntentRegistry,
} from "@angriff36/manifest/ir-compiler";
import { compileProjectToIR } from "@angriff36/manifest/multi-compiler";
import { getConfigPaths } from "./read-config.mjs";

// Honest provenance: read the installed compiler version from the package
// itself instead of a hardcoded literal (which silently goes stale on every
// `@angriff36/manifest` bump). The package exposes `./package.json` in exports.
const require = createRequire(import.meta.url);
const COMPILER_VERSION = (() => {
  try {
    return require("@angriff36/manifest/package.json").version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

/**
 * Deterministic JSON serialization: recursively sorts all object keys so the
 * output is byte-identical for structurally equal inputs.  Matches the
 * algorithm used by RuntimeEngine.verifyIRHash() upstream.
 */
function deterministicStringify(obj) {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = value[key];
          return sorted;
        }, {});
    }

    return value;
  });
}

function normalizeDiagnosticMessage(message) {
  const cwd = process.cwd();
  const repoRootWin = cwd.replaceAll("/", "\\").toLowerCase();
  const repoRootPosix = cwd.replaceAll("\\", "/").toLowerCase();
  return message.replace(/\[([^\]]+)\]/g, (_match, rawPath) => {
    const winPath = rawPath.replaceAll("/", "\\");
    const posixPath = rawPath.replaceAll("\\", "/");
    const winLower = winPath.toLowerCase();
    const posixLower = posixPath.toLowerCase();

    let relPath = null;
    if (winLower === repoRootWin || winLower.startsWith(`${repoRootWin}\\`)) {
      relPath = relative(cwd, winPath);
    } else if (
      posixLower === repoRootPosix ||
      posixLower.startsWith(`${repoRootPosix}/`)
    ) {
      relPath = relative(cwd, posixPath);
    }

    if (!relPath) {
      return `[${rawPath}]`;
    }
    return `[${relPath.split("\\").join("/")}]`;
  });
}

/**
 * Post-compile enrichment: populate computed property `dependencies` arrays.
 *
 * The upstream parser's `extractDependencies` only captures standalone
 * identifiers, not `self.X` member-access references.  This function walks
 * each computed property's expression AST, collects all `self.X` property
 * names, and intersects them with the entity's own computed property names
 * to produce a correct dependency list.  Without this, the runtime's
 * `markComputedPropertiesStale` (runtime-engine.js) cannot propagate cache
 * invalidation transitively through computed-to-computed chains.
 */
function enrichComputedDependencies(ir) {
  let enrichedCount = 0;

  for (const entity of ir.entities ?? []) {
    const computedNames = new Set(
      (entity.computedProperties ?? []).map((cp) => cp.name)
    );
    if (computedNames.size === 0) {
      continue;
    }

    for (const cp of entity.computedProperties) {
      const selfRefs = collectSelfPropertyRefs(cp.expression);
      const deps = [...selfRefs].filter((name) => computedNames.has(name));
      // Only update if the list actually changed (avoids false churn in IR diffs)
      if (
        deps.length > 0 &&
        JSON.stringify(deps.sort()) !==
          JSON.stringify([...(cp.dependencies ?? [])].sort())
      ) {
        cp.dependencies = deps;
        enrichedCount++;
      }
    }
  }

  return enrichedCount;
}

/**
 * Walk an expression AST node and collect all property names accessed via
 * `self.X` member-access patterns.
 */
function collectSelfPropertyRefs(expr) {
  const refs = new Set();
  if (!expr || typeof expr !== "object") {
    return refs;
  }

  const walk = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }
    // MemberAccess: { kind: "member", object: { kind: "identifier", name: "self" }, property: "foo" }
    if (
      node.kind === "member" &&
      node.object?.kind === "identifier" &&
      node.object.name === "self" &&
      typeof node.property === "string"
    ) {
      refs.add(node.property);
    }
    // Recurse into all child properties that could be expression nodes
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object" && item.kind) {
            walk(item);
          }
        }
      } else if (value && typeof value === "object" && value.kind) {
        walk(value);
      }
    }
  };

  walk(expr);
  return refs;
}

/**
 * Build a DSL source-map: for every entity, command, constraint (invariant),
 * and state transition, record the originating `.manifest` file + 1-based line.
 *
 * The upstream compiler does not carry source spans into the IR (verified: no
 * loc/line/sourceFile keys anywhere in kitchen.ir.json), so we recover them by
 * line-scanning the source. Keys are shaped for runtime lookup from a command
 * failure (which knows entity + command + the blocked constraint name):
 *   entity:<Entity> · command:<Entity>.<cmd> · constraint:<Entity>.<name> ·
 *   transition:<Entity>.<property>
 *
 * "Current entity" = the most recent `entity X` header; commands/constraints/
 * transitions always appear inside their entity block after that header, so a
 * full brace parser is unnecessary. First occurrence of a key wins.
 */
const SOURCE_MAP_ENTITY_RE = /^\s*(?:external\s+)?entity\s+(\w+)/;
const SOURCE_MAP_COMMAND_RE = /^\s*(?:async\s+)?command\s+(\w+)/;
const SOURCE_MAP_CONSTRAINT_RE = /^\s*constraint\s+(\w+)\s*[:{]/;
const SOURCE_MAP_TRANSITION_RE = /^\s*transition\s+(\w+)\s+from\b/;
const LINE_SPLIT_RE = /\r?\n/;

/**
 * Classify one source line → `{ entity?, key? }`. `entity` is set only on an
 * `entity X` header (updates the caller's current-entity cursor); `key` is the
 * `<kind>:<Entity>.<name>` map key, or absent when the line declares nothing.
 */
function sourceMapKeyForLine(line, currentEntity) {
  const entityMatch = SOURCE_MAP_ENTITY_RE.exec(line);
  if (entityMatch) {
    return { entity: entityMatch[1], key: `entity:${entityMatch[1]}` };
  }
  if (!currentEntity) {
    return {};
  }
  const commandMatch = SOURCE_MAP_COMMAND_RE.exec(line);
  if (commandMatch) {
    return { key: `command:${currentEntity}.${commandMatch[1]}` };
  }
  const constraintMatch = SOURCE_MAP_CONSTRAINT_RE.exec(line);
  if (constraintMatch) {
    return { key: `constraint:${currentEntity}.${constraintMatch[1]}` };
  }
  const transitionMatch = SOURCE_MAP_TRANSITION_RE.exec(line);
  if (transitionMatch) {
    return { key: `transition:${currentEntity}.${transitionMatch[1]}` };
  }
  return {};
}

function buildCommandSourceMap(manifestFiles) {
  const entries = {};
  const record = (key, file, line) => {
    if (!(key in entries)) {
      entries[key] = { file, line };
    }
  };

  for (const file of manifestFiles) {
    const lines = readFileSync(join(MANIFESTS_DIR, file), "utf8").split(
      LINE_SPLIT_RE
    );
    let currentEntity = null;
    for (let i = 0; i < lines.length; i++) {
      const { entity, key } = sourceMapKeyForLine(lines[i], currentEntity);
      if (entity) {
        currentEntity = entity;
      }
      if (key) {
        record(key, file, i + 1);
      }
    }
  }

  // Sort keys for deterministic output (zero git drift on re-run).
  const sortedEntries = {};
  for (const key of Object.keys(entries).sort()) {
    sortedEntries[key] = entries[key];
  }
  return sortedEntries;
}

const {
  srcDir: MANIFESTS_DIR,
  outputDir: OUTPUT_DIR,
  registryDir: REGISTRY_DIR,
  registryPath: REGISTRY_FILE,
} = getConfigPaths();

// IR file names are project-specific (kitchen.* convention) — not configurable
const OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.ir.json");
const COMMANDS_FILE = join(OUTPUT_DIR, "kitchen.commands.json");
const MERGE_REPORT_FILE = join(OUTPUT_DIR, "kitchen.merge-report.json");
const MODULE_GRAPH_FILE = join(OUTPUT_DIR, "module-graph.json");
// Statically importable by the runtime (sibling of commands.registry.json) so
// the error serializer can annotate violations with their DSL source location.
const SOURCE_MAP_FILE = join(REGISTRY_DIR, "command-source-map.json");

/**
 * Recursively discover .manifest files under srcDir (supports domain subdirs).
 * Returns posix-style relative paths sorted for determinism.
 */
function discoverManifestFiles(dir) {
  const found = [];
  const walk = (currentDir) => {
    for (const entry of readdirSync(currentDir, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name)
    )) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".manifest")) {
        found.push(relative(MANIFESTS_DIR, fullPath).split("\\").join("/"));
      }
    }
  };
  walk(dir);
  return found.sort();
}

function enforceNoDuplicateCommandIntent(compiledEntries) {
  const diagnostics = validateCommandIntentRegistry(
    compiledEntries.flatMap(({ source, ir }) =>
      (ir.commands ?? []).map((command) => ({
        entity: command.entity,
        command: command.name,
        sourcePath: source,
      }))
    )
  );

  if (diagnostics.length > 0) {
    console.error("[manifest/compile] Duplicate command intent detected:");
    for (const diagnostic of diagnostics) {
      console.error(`  - ${diagnostic.message}`);
    }
    process.exit(1);
  }
}

async function compileMergedManifests() {
  console.log("[manifest/compile] Starting merged compilation...");

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifestFiles = discoverManifestFiles(MANIFESTS_DIR);

  console.log(
    `[manifest/compile] Found ${manifestFiles.length} manifest(s) under ${MANIFESTS_DIR}`
  );

  // Compile each manifest to IR
  const compiledEntries = [];
  for (const manifestFile of manifestFiles) {
    const manifestPath = join(MANIFESTS_DIR, manifestFile);
    const manifestSource = readFileSync(manifestPath, "utf-8");

    // Files with `use` declarations depend on cross-file resolution — skip
    // per-file compile (compileToIR doesn't resolve `use` directives) and let
    // compileProjectToIR handle them authoritatively below.
    const hasUseDeclarations = /^\s*use\s+"[^"]+\.manifest"/m.test(
      manifestSource
    );
    if (hasUseDeclarations) {
      compiledEntries.push({ source: manifestFile, ir: null, skipped: true });
      continue;
    }

    const { ir, diagnostics } = await compileToIR(manifestSource);

    if (!ir) {
      console.error(`[manifest/compile] Failed to compile ${manifestFile}:`);
      for (const d of diagnostics) {
        console.error(`  - ${d.message}`);
      }
      process.exit(1);
    }

    // Native compileToIR (2.5.1+) populates command.entity, so the old
    // enforceCommandOwnership repair is no longer applied (see U6 / D14).
    compiledEntries.push({
      source: manifestFile,
      ir,
    });
  }

  enforceNoDuplicateCommandIntent(compiledEntries.filter((e) => !e.skipped));

  const crypto = await import("node:crypto");

  // contentHash: hash of all source .manifest contents (sorted for determinism).
  // Computed BEFORE merge so it can drive a deterministic `compiledAt`.
  const sourceHashes = compiledEntries
    .map((e) =>
      crypto
        .createHash("sha256")
        .update(readFileSync(join(MANIFESTS_DIR, e.source), "utf8"))
        .digest("hex")
    )
    .sort();
  const contentHash = crypto
    .createHash("sha256")
    .update(sourceHashes.join("\n"))
    .digest("hex");

  // Idempotent provenance timestamp: if the committed IR was produced from the
  // SAME sources (identical contentHash), reuse its `compiledAt` so re-running
  // `pnpm manifest:compile` is byte-identical (zero git drift — phase-out
  // exit criterion #3). A live `new Date()` here previously dirtied the IR,
  // provenance, and merge-report on every run even when nothing changed.
  // The timestamp now means "when the sources last actually changed."
  const compiledAt = (() => {
    if (existsSync(OUTPUT_FILE)) {
      try {
        const prior = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
        if (
          prior?.provenance?.contentHash === contentHash &&
          prior?.provenance?.compiledAt
        ) {
          return prior.provenance.compiledAt;
        }
      } catch {
        // Unreadable/old format — fall through to a fresh timestamp.
      }
    }
    return new Date().toISOString();
  })();

  // Authoritative merge: NATIVE compileProjectToIR resolves `use` declarations,
  // enforces a single tenant (the shared _base.manifest), validates cross-file
  // references, and merges sagas/webhooks/schedules/reactions (2.5.0+). This
  // replaces the old hand-rolled mergeIrs + tenant-reconciliation glue (U6/D11/D12).
  const resolverHost = {
    readFile: (p) => readFileAsync(p, "utf8"),
    resolvePath: (fromDir, rel) => resolve(fromDir, rel),
    fileExists: async (p) => {
      try {
        await accessAsync(p);
        return true;
      } catch {
        return false;
      }
    },
  };
  const projectEntries = manifestFiles.map((f) => join(MANIFESTS_DIR, f));
  const { ir: mergedIR, diagnostics: mergeDiagnostics } =
    await compileProjectToIR({
      entries: projectEntries,
      host: resolverHost,
      basePath: MANIFESTS_DIR,
    });
  const mergeErrors = (mergeDiagnostics ?? []).filter(
    (d) => d.severity === "error"
  );
  if (!mergedIR || mergeErrors.length > 0) {
    console.error("[manifest/compile] Native multi-file merge failed:");
    for (const d of mergeErrors.slice(0, 30)) {
      console.error(`  - ${normalizeDiagnosticMessage(d.message)}`);
    }
    if (mergeErrors.length > 30) {
      console.error(`  ... and ${mergeErrors.length - 30} more`);
    }
    process.exit(1);
  }
  const mergeWarnings = (mergeDiagnostics ?? []).filter(
    (d) => d.severity !== "error"
  );

  const mergeReport = {
    strategy: "native-compileProjectToIR",
    compilerVersion: COMPILER_VERSION,
    sources: compiledEntries.map((e) => e.source),
    counts: {
      entities: mergedIR.entities?.length ?? 0,
      commands: mergedIR.commands?.length ?? 0,
      events: mergedIR.events?.length ?? 0,
      sagas: mergedIR.sagas?.length ?? 0,
      reactions: mergedIR.reactions?.length ?? 0,
    },
    warnings: mergeWarnings.map((d) => normalizeDiagnosticMessage(d.message)),
  };

  // Enrich computed-property dependencies (self.X → computed-to-computed chains)
  // BEFORE hashing, so the stored irHash covers the final (enriched) IR and the
  // runtime's verifyIRHash() matches. (Enriching after the hash would silently
  // invalidate it.)
  const enrichedDeps = enrichComputedDependencies(mergedIR);
  if (enrichedDeps > 0) {
    console.log(
      `[manifest/compile] Enriched ${enrichedDeps} computed-property dependency declarations`
    );
  }

  // Provenance: overwrite native provenance with capsule's deterministic shape
  // so the IR hash stays stable and runtime verifyIRHash() matches. contentHash
  // is the SHA-256 of the sources (computed above); irHash is the deterministic
  // SHA-256 of the IR JSON itself with irHash cleared first.
  mergedIR.provenance = {
    compilerVersion: COMPILER_VERSION,
    schemaVersion: "1.0",
    contentHash,
    compiledAt,
    irHash: "",
  };
  const canonicalIR = JSON.parse(JSON.stringify(mergedIR));
  const irHash = crypto
    .createHash("sha256")
    .update(deterministicStringify(canonicalIR))
    .digest("hex");
  mergedIR.provenance.irHash = irHash;

  if (mergeWarnings.length > 0) {
    console.warn(
      `[manifest/compile] Native merge emitted ${mergeWarnings.length} warning(s)`
    );
    for (const w of mergeWarnings.slice(0, 20)) {
      console.warn(`  ${normalizeDiagnosticMessage(w.message)}`);
    }
  }

  console.log(
    `[manifest/compile] Merged IR: ${mergedIR.entities.length} entities, ${mergedIR.commands.length} commands, ${mergedIR.events.length} events`
  );

  // Write merged IR
  writeFileSync(OUTPUT_FILE, JSON.stringify(mergedIR, null, 2));

  // Derive and emit kitchen.commands.json — projection-agnostic command manifest.
  // Source: ir.commands[] only. No filesystem reads, no URL paths, no Next.js logic.
  // Fields: entity, command (name), commandId (entity.name). Sorted: entity ASC, command ASC.
  const commandsManifest = (mergedIR.commands ?? [])
    .map((cmd) => ({
      entity: cmd.entity,
      command: cmd.name,
      commandId: `${cmd.entity}.${cmd.name}`,
    }))
    .sort((a, b) => {
      const entityCmp = a.entity.localeCompare(b.entity);
      if (entityCmp !== 0) {
        return entityCmp;
      }
      return a.command.localeCompare(b.command);
    });
  writeFileSync(COMMANDS_FILE, JSON.stringify(commandsManifest, null, 2));
  console.log(
    `[manifest/compile] Emitted ${commandsManifest.length} entries to kitchen.commands.json`
  );

  // Emit canonical merged registry (same data, new canonical path).
  mkdirSync(REGISTRY_DIR, { recursive: true });
  writeFileSync(REGISTRY_FILE, JSON.stringify(commandsManifest, null, 2));
  console.log(
    `[manifest/compile] Emitted ${commandsManifest.length} entries to commands.registry.json`
  );

  // Also write provenance file
  const provenanceFile = join(OUTPUT_DIR, "kitchen.provenance.json");
  writeFileSync(provenanceFile, JSON.stringify(mergedIR.provenance, null, 2));
  writeFileSync(MERGE_REPORT_FILE, JSON.stringify(mergeReport, null, 2));

  const moduleGraph = {
    version: 1,
    compiledAt: mergedIR.provenance?.compiledAt ?? null,
    contentHash: mergedIR.provenance?.contentHash ?? null,
    sources: compiledEntries.map(({ source, ir }) => ({
      path: source,
      domain: source.includes("/") ? source.split("/")[0] : "root",
      entities: ir?.entities?.length ?? 0,
      commands: ir?.commands?.length ?? 0,
      events: ir?.events?.length ?? 0,
    })),
    merged: {
      path: "kitchen.ir.json",
      entities: mergedIR.entities?.length ?? 0,
      commands: mergedIR.commands?.length ?? 0,
      events: mergedIR.events?.length ?? 0,
    },
  };
  writeFileSync(MODULE_GRAPH_FILE, JSON.stringify(moduleGraph, null, 2));
  console.log(
    `[manifest/compile] Emitted module graph (${moduleGraph.sources.length} sources)`
  );

  // DSL source-map sidecar: entity/command/constraint/transition → file+line.
  // Deterministic (derived purely from source content), statically imported by
  // the runtime error serializer to point violations back at their .manifest.
  const sourceMapEntries = buildCommandSourceMap(manifestFiles);
  writeFileSync(
    SOURCE_MAP_FILE,
    JSON.stringify({ version: 1, entries: sourceMapEntries }, null, 2)
  );
  console.log(
    `[manifest/compile] Emitted source map (${Object.keys(sourceMapEntries).length} entries) to command-source-map.json`
  );

  console.log("[manifest/compile] Compilation complete!");
}

compileMergedManifests().catch((err) => {
  console.error("[manifest/compile] Fatal error:", err);
  process.exit(1);
});
