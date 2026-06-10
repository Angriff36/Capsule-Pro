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

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  compileToIR,
  validateCommandIntentRegistry,
} from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership, mergeIrs } from "./ir-utils.mjs";
import { getConfigPaths } from "./read-config.mjs";

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

  // Read all .manifest files
  const manifestFiles = readdirSync(MANIFESTS_DIR)
    .filter((f) => f.endsWith(".manifest"))
    .sort();

  console.log(`[manifest/compile] Found ${manifestFiles.length} manifest(s)`);

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

    const manifestName = manifestFile.replace(/\.manifest$/, "");
    compiledEntries.push({
      source: manifestFile,
      ir: enforceCommandOwnership(ir, manifestName),
    });
  }

  enforceNoDuplicateCommandIntent(compiledEntries);

  const {
    ir: mergedIR,
    duplicateWarnings,
    mergeReport,
  } = mergeIrs(compiledEntries, {
    contentHash: "",
    irHash: "",
    compilerVersion: "2.2.0",
    schemaVersion: "1.0",
    compiledAt: new Date().toISOString(),
  });

  // Compute provenance hashes after merge. contentHash = SHA-256 of serialized IR
  // (covers the exact bytes that land on disk). irHash = SHA-256 of all source
  // .manifest contents (sorted for determinism).
  const crypto = await import("node:crypto");
  const irJson = JSON.stringify(mergedIR, null, 2);
  const contentHash = crypto.createHash("sha256").update(irJson).digest("hex");
  const sourceHashes = compiledEntries
    .map((e) => crypto.createHash("sha256").update(readFileSync(join(MANIFESTS_DIR, e.source), "utf8")).digest("hex"))
    .sort();
  const irHash = crypto.createHash("sha256").update(sourceHashes.join("\n")).digest("hex");
  if (mergedIR.provenance) {
    mergedIR.provenance.contentHash = contentHash;
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

  console.log("[manifest/compile] Compilation complete!");
}

compileMergedManifests().catch((err) => {
  console.error("[manifest/compile] Fatal error:", err);
  process.exit(1);
});
