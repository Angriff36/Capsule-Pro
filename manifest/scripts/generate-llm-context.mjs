#!/usr/bin/env node
/**
 * Generates structured LLM context JSON from the compiled Manifest IR using the
 * upstream LlmContextProjection.
 *
 * Produces three artifacts:
 *   1. manifest-context-summary.json  — lightweight (no raw IR, no expressions)
 *   2. manifest-context-full.json     — complete context with expressions (no raw IR)
 *   3. manifest-context-ir.json       — raw IR passthrough
 *
 * The summary is optimized for AI agent context injection — a single file that
 * describes the full domain model (entities, commands, policies, constraints,
 * relationships, events, stores) without requiring MCP server tool calls.
 *
 * Usage:
 *   node manifest/scripts/generate-llm-context.mjs
 *
 * Output: manifest/generated/llm-context/
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");
const OUT_DIR = join(root, "manifest", "generated", "llm-context");

// ── Load IR ──
console.log("[llm-context] Loading IR...");
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

// ── Generate using upstream projection ──
// llm-context projection is not in package exports — import directly from dist.
// Same approach as generate-kysely.mjs and generate-mermaid.mjs.
const generatorPath = join(
  root,
  "node_modules",
  "@angriff36",
  "manifest",
  "dist",
  "manifest",
  "projections",
  "llm-context",
  "generator.js"
);
const generatorUrl = import.meta.resolve(
  `file://${generatorPath.replace(/\\/g, "/")}`
);
const { LlmContextProjection } = await import(generatorUrl);
const projection = new LlmContextProjection();

mkdirSync(OUT_DIR, { recursive: true });

let filesWritten = 0;

/**
 * Generate and write a surface artifact.
 * @param {string} surface - Projection surface
 * @param {object} opts - Generation options
 * @param {string} filename - Output filename
 */
function generateSurface(surface, opts, filename) {
  const result = projection.generate(ir, { surface, options: opts });

  if (result.diagnostics?.length > 0) {
    for (const d of result.diagnostics) {
      if (d.severity === "error") {
        console.error(
          `  [llm-context] ${d.severity}: ${d.code} — ${d.message}`
        );
      } else {
        console.warn(`  [llm-context] ${d.severity}: ${d.message}`);
      }
    }
  }

  if (!result.artifacts?.length) {
    console.warn(`  [llm-context] No artifacts for ${surface}. Skipping.`);
    return;
  }

  const code = result.artifacts[0].code;
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, code);
  filesWritten++;

  const sizeKB = Buffer.byteLength(code, "utf8") / 1024;
  const ctx = JSON.parse(code);
  const entityCount = ctx.entities?.length ?? 0;
  const commandCount = ctx.commands?.length ?? 0;
  console.log(
    `  ${surface}: ${entityCount} entities, ${commandCount} commands, ${sizeKB.toFixed(1)} KB → ${outPath}`
  );
}

// ── Summary (lightweight, no expressions, no raw IR) ──
console.log("[llm-context] Generating summary...");
generateSurface("llm-context.summary", {}, "manifest-context-summary.json");

// ── Full context (with expressions, without raw IR) ──
console.log("[llm-context] Generating full context...");
generateSurface(
  "llm-context.full",
  { includeRawIR: false },
  "manifest-context-full.json"
);

// ── Raw IR passthrough ──
console.log("[llm-context] Generating raw IR...");
generateSurface("llm-context.ir", {}, "manifest-ir.json");

// ── Summary ──
console.log(
  `\n[llm-context] Done. ${filesWritten} file(s) written to ${OUT_DIR}`
);
