#!/usr/bin/env node
/**
 * generate-command-param-schemas — per-command Zod PARAMETER schemas from the IR.
 *
 * WHY: the canonical command dispatcher (run-manifest-command-core) runs these
 * schemas as a PRE-FLIGHT gate — validating a command's parameters BEFORE the
 * runtime is created, so malformed requests fail with a 400 without touching the
 * engine, IR resolution, or the database.
 *
 * SOURCE: the official `@angriff36/manifest` ZodProjection `zod.command` surface.
 * That surface emits one artifact per command with an entity-prefixed export
 * (e.g. `RecipeCreateParamsSchema = z.object({...})`), TYPE-ONLY (required params
 * bare, optional params `.optional()`, NO value constraints) — exactly the shape a
 * structural pre-flight gate wants. We read each artifact's `// Command: <cmd> on
 * <Entity>` header for the entity/command split and assemble ONE committed file
 * keyed by `"<Entity>.<command>"`.
 *
 * Mirrors the other Capsule producers (constitution §10: fix the producer, never
 * hand-edit generated output) and emits NO timestamp so a byte-level drift gate
 * (check-command-param-schemas-drift.mjs) is meaningful.
 *
 * Usage: node manifest/scripts/generate-command-param-schemas.mjs [--outfile <path>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const IR_PATH = resolve(PROJECT_ROOT, "manifest/ir/kitchen.ir.json");

const DEFAULT_OUTFILE = resolve(
  PROJECT_ROOT,
  "manifest/runtime/src/generated/command-param-schemas.generated.ts"
);

const args = process.argv.slice(2);
let outFile = DEFAULT_OUTFILE;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--outfile" && args[i + 1]) {
    outFile = resolve(args[i + 1]);
    i++;
  }
}

const ir = JSON.parse(readFileSync(IR_PATH, "utf-8"));

const { ZodProjection } = await import("@angriff36/manifest/projections/zod");

const result = new ZodProjection().generate(ir, {
  surface: "zod.command",
  options: { zodImportPath: "zod", emitHeader: true },
});

if (result.errors?.length) {
  console.error("ZodProjection errors:", result.errors);
  process.exit(1);
}

// Each artifact declares one entity-prefixed param schema, e.g.
//   // Command: create on Recipe
//   export const RecipeCreateParamsSchema = z.object({ ... });
// Match the header (for the "Entity.command" key) together with its export in a
// single pass. The schemas are flat (no nested object literals), so the first
// `})` after `z.object({` closes the expression — non-greedy capture.
const ENTRY_RE =
  /\/\/ Command: (\w+) on (\w+)\s+export const \w+ParamsSchema = (z\.object\(\{[\s\S]*?\}\))\s*;/;

/** @type {Map<string, string>} key "Entity.command" -> z.object(...) source */
const entries = new Map();

for (const artifact of result.artifacts ?? []) {
  const match = (artifact.code ?? "").match(ENTRY_RE);
  if (!match) {
    continue;
  }
  const [, command, entity, schema] = match;
  entries.set(`${entity}.${command}`, schema);
}

if (entries.size === 0) {
  console.error(
    "No command param schemas extracted — aborting (parser drift?)."
  );
  process.exit(1);
}

const keys = [...entries.keys()].sort();

const body = keys
  .map((k) => `  ${JSON.stringify(k)}: ${entries.get(k)},`)
  .join("\n");

const out = `// @generated — Manifest command parameter schemas (zod.command surface). DO NOT EDIT.
// Regenerate: pnpm manifest:command-schemas
//
// Per-command Zod PARAMETER schemas derived from the compiled IR via the official
// @angriff36/manifest ZodProjection "zod.command" surface (type-only: required
// params bare, optional params .optional(), no value constraints). Consumed by the
// canonical command dispatcher (run-manifest-command-core) as a pre-flight gate
// that rejects malformed requests with a 400 before the runtime is created.
//
// Commands: ${keys.length}

import { z } from "zod";

export const COMMAND_PARAM_SCHEMAS: Record<string, z.ZodType> = {
${body}
};

/**
 * Look up the pre-flight parameter schema for a governed command. Returns
 * undefined when the command has no registered schema (then the gate is skipped
 * and the runtime remains the authority). Schemas are non-strict: unknown body
 * keys (e.g. the instance \`id\`, \`overrideRequests\`) are ignored, so the gate
 * only rejects missing required params / wrong primitive types — a subset of what
 * the engine itself enforces.
 */
export function getCommandParamSchema(
  entity: string,
  command: string
): z.ZodType | undefined {
  return COMMAND_PARAM_SCHEMAS[\`\${entity}.\${command}\`];
}
`;

writeFileSync(outFile, out, "utf-8");
console.log(`Generated ${keys.length} command param schemas → ${outFile}`);
