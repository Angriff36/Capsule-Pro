#!/usr/bin/env node

/**
 * Manifest Compile Script - Merges Multiple Manifests
 *
 * The Manifest CLI's --glob flag has a "last file wins" bug where only the
 * last manifest is included in the IR. This script uses the programmatic
 * compileToIR API to properly merge all manifests into a single IR.
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
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import {
  compileToIR,
  validateCommandIntentRegistry,
} from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership, mergeIrs } from "./ir-utils.mjs";
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
      (entity.computedProperties ?? []).map((cp) => cp.name),
    );
    if (computedNames.size === 0) continue;

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
  if (!expr || typeof expr !== "object") return refs;

  const walk = (node) => {
    if (!node || typeof node !== "object") return;
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
          if (item && typeof item === "object" && item.kind) walk(item);
        }
      } else if (value && typeof value === "object" && value.kind) {
        walk(value);
      }
    }
  };

  walk(expr);
  return refs;
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
const SHARDS_DIR = join(OUTPUT_DIR, "shards");
const MODULE_GRAPH_FILE = join(OUTPUT_DIR, "module-graph.json");

/**
 * Recursively discover .manifest files under srcDir (supports domain subdirs).
 * Returns posix-style relative paths sorted for determinism.
 */
function discoverManifestFiles(dir) {
  const found = [];
  const walk = (currentDir) => {
    for (const entry of readdirSync(currentDir, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".manifest")) {
        found.push(
          relative(MANIFESTS_DIR, fullPath).split("\\").join("/"),
        );
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
    `[manifest/compile] Found ${manifestFiles.length} manifest(s) under ${MANIFESTS_DIR}`,
  );

  // Compile each manifest to IR
  const compiledEntries = [];
  for (const manifestFile of manifestFiles) {
    const manifestPath = join(MANIFESTS_DIR, manifestFile);
    const manifestSource = readFileSync(manifestPath, "utf-8");

    const { ir, diagnostics } = await compileToIR(manifestSource);

    if (!ir) {
      console.error(`[manifest/compile] Failed to compile ${manifestFile}:`);
      for (const d of diagnostics) {
        console.error(`  - ${d.message}`);
      }
      process.exit(1);
    }

    const manifestName = manifestFile
      .replace(/\.manifest$/, "")
      .replace(/\//g, "-");
    const ownedIr = enforceCommandOwnership(ir, manifestName);
    compiledEntries.push({
      source: manifestFile,
      ir: ownedIr,
    });

    mkdirSync(SHARDS_DIR, { recursive: true });
    const shardPath = join(SHARDS_DIR, `${manifestName}.ir.json`);
    writeFileSync(shardPath, JSON.stringify(ownedIr, null, 2));
  }

  enforceNoDuplicateCommandIntent(compiledEntries);

  const crypto = await import("node:crypto");

  // contentHash: hash of all source .manifest contents (sorted for determinism).
  // Computed BEFORE merge so it can drive a deterministic `compiledAt`.
  const sourceHashes = compiledEntries
    .map((e) => crypto.createHash("sha256").update(readFileSync(join(MANIFESTS_DIR, e.source), "utf8")).digest("hex"))
    .sort();
  const contentHash = crypto.createHash("sha256").update(sourceHashes.join("\n")).digest("hex");

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

  const {
    ir: mergedIR,
    duplicateWarnings,
    mergeReport,
  } = mergeIrs(compiledEntries, {
    contentHash: "",
    irHash: "",
    compilerVersion: COMPILER_VERSION,
    schemaVersion: "1.0",
    compiledAt,
  });

  // Compute provenance hashes after merge.
  // Per IR spec: contentHash = SHA-256 of source manifest(s) (provenance of where
  // the IR came from). irHash = deterministic SHA-256 of the IR JSON itself
  // (runtime integrity — matches what RuntimeEngine.verifyIRHash() computes).
  // irHash: deterministic hash of the IR JSON (sorted keys, irHash stripped from
  // provenance — matches RuntimeEngine.verifyIRHash() algorithm).
  // We must compute BEFORE writing irHash into the provenance, then set it.
  if (mergedIR.provenance) {
    mergedIR.provenance.contentHash = contentHash;
    mergedIR.provenance.irHash = ""; // clear for canonical computation
  }
  const canonicalIR = JSON.parse(JSON.stringify(mergedIR));
  const irHash = crypto
    .createHash("sha256")
    .update(deterministicStringify(canonicalIR))
    .digest("hex");
  if (mergedIR.provenance) {
    mergedIR.provenance.irHash = irHash;
  }

  if (duplicateWarnings.length > 0) {
    console.warn(
      `[manifest/compile] Merge dropped ${duplicateWarnings.length} duplicate definitions`
    );
    for (const warning of duplicateWarnings.slice(0, 20)) {
      console.warn(`  ${warning}`);
    }
    if (duplicateWarnings.length > 20) {
      console.warn(
        `  ... and ${duplicateWarnings.length - 20} more duplicate definitions`
      );
    }
  }

  // Enrich computed-property dependencies (self.X → computed-to-computed chains)
  const enrichedDeps = enrichComputedDependencies(mergedIR);
  if (enrichedDeps > 0) {
    console.log(
      `[manifest/compile] Enriched ${enrichedDeps} computed-property dependency declarations`
    );
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
      if (entityCmp !== 0) return entityCmp;
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
      entities: ir.entities?.length ?? 0,
      commands: ir.commands?.length ?? 0,
      events: ir.events?.length ?? 0,
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
    `[manifest/compile] Emitted module graph (${moduleGraph.sources.length} sources) + IR shards`,
  );

  console.log("[manifest/compile] Compilation complete!");
}

compileMergedManifests().catch((err) => {
  console.error("[manifest/compile] Fatal error:", err);
  process.exit(1);
});
