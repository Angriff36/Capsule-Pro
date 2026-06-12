#!/usr/bin/env node
/**
 * Reaction payload conformance gate.
 *
 * The runtime populates an emitted event's payload with `{ ...commandInput, result }`
 * (runtime-engine emit path) — NOT the event's declared payload schema. A reaction's
 * `payload.X` reference therefore only works when X is a parameter of the command
 * that emitted the event (or `result` / engine-enriched `_subject`/`_eventName`/
 * `_channel`). References to anything else evaluate to `undefined` and the reaction
 * silently no-ops — the bug class that killed 9/10 shipped reactions (notes §, task 9.2).
 *
 * Checks, per IR reaction (resolve expression + every params expression):
 *   ERROR  payload.X where X is not a param of an emitting command and not result/_*
 *   ERROR  payload.result.Y where the emitter is `create` and Y is not a property of
 *          the emitting entity (create's result is the created instance)
 *   WARN   payload.result.Y on a non-create emitter when Y is not an entity property
 *          (lastActionResult shape is not statically known)
 *   ERROR  reaction on an event no command emits (orphan reaction)
 *
 * Baseline: manifest/governance/reaction-payload-baseline.json — pre-existing ERROR
 * keys. Strict mode fails only on NEW errors. Entries may only ever be REMOVED from
 * the baseline, never added (same convention as schema-drift-baseline.json).
 *
 * Usage:
 *   node manifest/scripts/check-reaction-payloads.mjs            # report all
 *   node manifest/scripts/check-reaction-payloads.mjs --strict   # fail on new errors
 *   node manifest/scripts/check-reaction-payloads.mjs --write-baseline
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const IR_PATH = resolve("manifest/ir/kitchen.ir.json");
const BASELINE_PATH = resolve(
  "manifest/governance/reaction-payload-baseline.json"
);
const STRICT = process.argv.includes("--strict");
const WRITE_BASELINE = process.argv.includes("--write-baseline");

const ENRICHED_FIELDS = new Set(["_subject", "_eventName", "_channel"]);

const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

/** eventName -> [{ entity, command, paramNames:Set }] */
const emittersByEvent = new Map();
for (const cmd of ir.commands ?? []) {
  for (const ev of cmd.emits ?? []) {
    if (!emittersByEvent.has(ev)) {
      emittersByEvent.set(ev, []);
    }
    emittersByEvent.get(ev).push({
      entity: cmd.entity,
      command: cmd.name,
      paramNames: new Set((cmd.parameters ?? []).map((p) => p.name)),
    });
  }
}

/** entityName -> Set of property names (declared + timestamps; create result = instance) */
const entityProps = new Map();
for (const ent of ir.entities ?? []) {
  const names = new Set((ent.properties ?? []).map((p) => p.name));
  for (const c of ent.computedProperties ?? []) {
    names.add(c.name);
  }
  names.add("id");
  entityProps.set(ent.name, names);
}

/**
 * Extract `payload.*` / `self.*` member chains from an IR expression AST.
 * Member spines rooted at the payload identifier are captured whole and not
 * re-walked; everything else recurses generically.
 */
function collectPayloadChains(node, out) {
  if (node == null || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const n of node) {
      collectPayloadChains(n, out);
    }
    return;
  }
  if (node.kind === "member") {
    const chain = [];
    let spine = node;
    while (
      spine &&
      spine.kind === "member" &&
      typeof spine.property === "string"
    ) {
      chain.unshift(spine.property);
      spine = spine.object;
    }
    if (
      spine &&
      spine.kind === "identifier" &&
      (spine.name === "payload" || spine.name === "self")
    ) {
      if (chain.length > 0) {
        out.push(chain);
      }
      return; // whole spine consumed
    }
    // Not a payload chain — recurse into the unconsumed parts.
    collectPayloadChains(spine, out);
    return;
  }
  for (const key of Object.keys(node)) {
    if (
      key === "kind" ||
      key === "property" ||
      key === "name" ||
      key === "operator"
    ) {
      continue;
    }
    collectPayloadChains(node[key], out);
  }
}

const errors = [];
const warnings = [];

for (const reaction of ir.reactions ?? []) {
  const label = `${reaction.event} -> ${reaction.targetEntity}.${reaction.targetCommand}`;
  const emitters = emittersByEvent.get(reaction.event) ?? [];

  if (emitters.length === 0) {
    errors.push({
      key: `${label} :: orphan-event`,
      message: `${label}: no command emits '${reaction.event}' — reaction can never fire`,
    });
    continue;
  }

  const chains = [];
  collectPayloadChains(reaction.resolve, chains);
  for (const p of reaction.params ?? []) {
    collectPayloadChains(p.expression, chains);
  }

  const seen = new Set();
  for (const chain of chains) {
    const chainStr = chain.join(".");
    if (seen.has(chainStr)) {
      continue;
    }
    seen.add(chainStr);

    const head = chain[0];
    if (ENRICHED_FIELDS.has(head)) {
      continue;
    }

    if (head === "result") {
      if (chain.length === 1) {
        continue;
      }
      const field = chain[1];
      for (const em of emitters) {
        const props = entityProps.get(em.entity) ?? new Set();
        const key = `${label} :: payload.${chainStr} :: emitter=${em.entity}.${em.command}`;
        if (em.command === "create") {
          // create's result is the created instance — property refs are valid.
          if (props.has(field)) {
            continue;
          }
          errors.push({
            key,
            message: `${label}: payload.result.${field} — '${field}' is not a property of ${em.entity} (create result is the created instance); undefined at runtime`,
          });
        } else {
          // Non-create commands: the engine's `result` is the LAST ACTION'S
          // VALUE (a mutate returns the assigned scalar — runtime-engine
          // `case 'mutate': ... return value`), NOT the instance. result.*
          // member access is therefore almost certainly undefined.
          warnings.push(
            `${label}: payload.result.${field} via ${em.entity}.${em.command} — non-create commands return the last mutate's VALUE as result (not the instance); this is likely undefined at runtime. Use payload._subject.id for the instance id or an input param.`
          );
        }
      }
      continue;
    }

    for (const em of emitters) {
      if (em.paramNames.has(head)) {
        continue;
      }
      const key = `${label} :: payload.${chainStr} :: emitter=${em.entity}.${em.command}`;
      errors.push({
        key,
        message: `${label}: payload.${chainStr} — '${head}' is not a parameter of emitter ${em.entity}.${em.command}(${[...em.paramNames].join(", ")}); undefined at runtime (payload = {...input, result})`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Baseline handling
// ---------------------------------------------------------------------------
const baseline = existsSync(BASELINE_PATH)
  ? new Set(JSON.parse(readFileSync(BASELINE_PATH, "utf8")).violations ?? [])
  : new Set();

const newErrors = errors.filter((e) => !baseline.has(e.key));
const staleBaseline = [...baseline].filter(
  (k) => !errors.some((e) => e.key === k)
);

if (WRITE_BASELINE) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $doc: "Pre-existing reaction payload violations (see check-reaction-payloads.mjs). Entries may only be REMOVED as reactions are fixed — never added. Strict mode fails on NEW violations only.",
        violations: errors.map((e) => e.key).sort(),
      },
      null,
      2
    )}\n`
  );
  console.log(
    `Baseline written: ${errors.length} violation(s) -> ${BASELINE_PATH}`
  );
  process.exit(0);
}

console.log(`reactions checked: ${(ir.reactions ?? []).length}`);
console.log(
  `errors: ${errors.length} (${newErrors.length} new vs baseline of ${baseline.size})`
);
console.log(`warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log("\n--- ERRORS (silent no-op risk) ---");
  for (const e of errors) {
    console.log(
      `${baseline.has(e.key) ? "[baselined] " : "[NEW]       "}${e.message}`
    );
  }
}
if (warnings.length > 0) {
  console.log("\n--- WARNINGS ---");
  for (const w of warnings) {
    console.log(`  ${w}`);
  }
}
if (staleBaseline.length > 0) {
  console.log(
    "\n--- STALE BASELINE ENTRIES (fixed — remove from baseline) ---"
  );
  for (const k of staleBaseline) {
    console.log(`  ${k}`);
  }
}

if (STRICT && newErrors.length > 0) {
  console.error(
    `\nFAIL: ${newErrors.length} NEW reaction payload violation(s). Fix the reaction or its emitting command — do not add baseline entries.`
  );
  process.exit(1);
}
console.log(
  `\nOK${errors.length ? " (pre-existing violations are baselined)" : ""}`
);
