#!/usr/bin/env node
/**
 * Generates analytics tracking artifacts from the compiled Manifest IR using
 * the upstream AnalyticsProjection.
 *
 * Produces three surfaces:
 *   1. analytics.tracking-plan → JSON tracking plan (all events with schemas)
 *   2. analytics.events        → TypeScript typed event interfaces + track()
 *   3. analytics.handlers      → Typed analytics.track() calls per entity
 *
 * Default provider: segment (supports segment, amplitude, mixpanel, snowplow).
 *
 * Usage:
 *   node manifest/scripts/generate-analytics.mjs
 *   node manifest/scripts/generate-analytics.mjs --provider amplitude
 *
 * Output: manifest/generated/analytics/
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");
const OUT_DIR = join(root, "manifest", "generated", "analytics");

// ── Parse CLI args ──
const args = process.argv.slice(2);
let provider = "segment";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--provider" && args[i + 1]) {
    provider = args[i + 1];
    i++;
  }
}

// ── Load IR ──
console.log("[analytics] Loading IR...");
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

// ── Import projection (direct dist path, not in package exports) ──
const generatorPath = join(
  root,
  "node_modules",
  "@angriff36",
  "manifest",
  "dist",
  "manifest",
  "projections",
  "analytics",
  "generator.js"
);
const generatorUrl = import.meta.resolve(
  `file://${generatorPath.replace(/\\/g, "/")}`
);
const { AnalyticsProjection } = await import(generatorUrl);
const projection = new AnalyticsProjection();

// ── Surfaces to generate ──
const surfaces = [
  { name: "analytics.tracking-plan", outFile: "tracking-plan.json" },
  { name: "analytics.events", outFile: "events.ts" },
  { name: "analytics.handlers", outFile: null }, // handlers emits multiple files
];

const sharedOptions = {
  provider,
  includeEntityProperties: true,
  emitPerEntityHandlers: false, // single handlers file
  emitHeader: true,
};

let totalArtifacts = 0;
let totalErrors = 0;
let totalWarnings = 0;
let totalInfo = 0;

// ── Generate each surface ──
for (const surface of surfaces) {
  console.log(`[analytics] Generating ${surface.name}...`);

  const result = projection.generate(ir, {
    surface: surface.name,
    options: sharedOptions,
  });

  // Report diagnostics
  for (const d of result.diagnostics || []) {
    if (d.severity === "error") {
      totalErrors++;
      console.error(`  [analytics] ERROR ${d.code}: ${d.message}`);
    } else if (d.severity === "warning") {
      totalWarnings++;
      console.warn(`  [analytics] WARN ${d.code}: ${d.message}`);
    } else {
      totalInfo++;
    }
  }

  if (!result.artifacts?.length) {
    console.warn(`  [analytics] No artifacts for ${surface.name} — skipping.`);
    continue;
  }

  if (surface.outFile) {
    // Single-artifact surface (tracking-plan, events)
    const artifact = result.artifacts[0];
    const outPath = join(OUT_DIR, surface.outFile);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(outPath, artifact.code);
    totalArtifacts++;
    console.log(`  [analytics] Wrote ${outPath}`);
  } else {
    // Multi-artifact surface (handlers) — flatten pathHint basename into OUT_DIR
    // The projection returns pathHint like "analytics/handlers.ts" which would
    // nest under OUT_DIR/analytics/. Strip directory prefix to keep files flat.
    mkdirSync(OUT_DIR, { recursive: true });
    for (const artifact of result.artifacts) {
      const baseName = artifact.pathHint.split(/[/\\]/).pop();
      const outPath = join(OUT_DIR, baseName);
      writeFileSync(outPath, artifact.code);
      totalArtifacts++;
      console.log(`  [analytics] Wrote ${outPath}`);
    }
  }
}

// ── Summary ──
console.log(`\n[analytics] Provider: ${provider}`);
console.log(`[analytics] IR entities: ${ir.entities?.length ?? 0}`);
console.log(`[analytics] IR commands: ${ir.commands?.length ?? 0}`);
console.log(`[analytics] IR events: ${ir.events?.length ?? 0}`);
console.log(`[analytics] Artifacts generated: ${totalArtifacts}`);
console.log(
  `[analytics] Diagnostics: ${totalErrors} errors, ${totalWarnings} warnings, ${totalInfo} info`
);
console.log(`[analytics] Output: ${OUT_DIR}`);
