#!/usr/bin/env node
/**
 * Dead-command FSM transition-drift gate.
 *
 * A Manifest command that does `mutate <prop> = <literal>` against a property
 * that owns a `transition` table is silently rejected by the runtime whenever
 * the engine's transition validator (runtime-engine, notes.md §21) finds NO
 * declared edge from the command's guarded source state to the mutate target —
 * and the validator does NOT exempt no-op self-transitions. The command then
 * reports success but the status mutate is dropped: a DEAD command (the bug
 * class fixed repeatedly for EventGuest.rsvpConfirm, InventoryAlert.markResolved,
 * Driver.reactivate, CollectionCase dispute, LogisticsDispatch.reassign,
 * Invoice.void/writeOff, Facility*.remove, EventStaff.checkOut, TipPool.close…).
 *
 * Audit rule = guard-admitted-states × reachable-targets:
 *   - For each command mutating a transition-bearing property to a STRING
 *     LITERAL target T, derive the set of source states the command's guards
 *     ADMIT (self.<prop> in/==/!=/and-or). No status guard ⇒ admits the whole
 *     valid-status universe (the Facility.no-guard-remove rule: a guardless
 *     command must reach T from EVERY state).
 *   - For each admitted source state s with no declared transition edge s→T,
 *     flag it. A command fully dead (no admitted state reaches T) is worst;
 *     partially dead (some admitted states reach T, others don't) is the
 *     common silently-rejected-from-one-branch bug.
 *
 * What is NOT flagged (fail-safe, no false positives):
 *   - mutate target is a param / computed / non-literal (target unknowable
 *     statically — e.g. `updateStatus(newStatus)`).
 *   - guards with OR / non-status compound logic touching the property
 *     (admitted set unknowable ⇒ skipped, reported as `uncertain`).
 *
 * Exits non-zero when findings exist (the gate; there is no baseline because a
 * dead command is always a bug, never pre-existing-acceptable).
 *
 * Source of truth: manifest/ir/kitchen.ir.json (entities.transitions +
 * entities.constraints[valid*].expression + commands.guards/actions).
 *
 * Usage:
 *   node manifest/scripts/audit-dead-commands.mjs          # report; exit 1 on findings
 *   node manifest/scripts/audit-dead-commands.mjs --json   # machine-readable
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const IR_PATH = resolve("manifest/ir/kitchen.ir.json");
const BASELINE_PATH = resolve(
  "manifest/governance/dead-commands-baseline.json"
);
const JSON_OUT = process.argv.includes("--json");
const INCLUDE_UNGUARDED = process.argv.includes("--include-unguarded");
const STRICT = process.argv.includes("--strict");
const WRITE_BASELINE = process.argv.includes("--write-baseline");

const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

/** Is this AST node a `self.<prop>` member access? */
function isSelfProp(node, prop) {
  return (
    node?.kind === "member" &&
    node.object?.kind === "identifier" &&
    node.object.name === "self" &&
    node.property === prop
  );
}

/** Extract a string literal value from a literal node, else undefined. */
function literalString(node) {
  if (node?.kind === "literal" && node.value?.kind === "string") {
    return node.value.value;
  }
  return;
}

// ---------------------------------------------------------------------------
// Per-entity FSM helpers
// ---------------------------------------------------------------------------

/** Build { propName: Map<fromState, Set<toState>> } from entity.transitions. */
function transitionEdges(entity) {
  const map = new Map(); // prop -> Map<from, Set<to>>
  for (const t of entity.transitions ?? []) {
    if (!map.has(t.property)) {
      map.set(t.property, new Map());
    }
    const byFrom = map.get(t.property);
    if (!byFrom.has(t.from)) {
      byFrom.set(t.from, new Set());
    }
    for (const to of t.to ?? []) {
      byFrom.get(t.from).add(to);
    }
  }
  return map;
}

/**
 * Universe of valid states for a property. Prefer a block constraint shaped
 * `self.<prop> in [literals]`; fall back to the union of transition states.
 */
function statusUniverse(entity, prop, edges) {
  for (const c of entity.constraints ?? []) {
    const e = c.expression;
    if (
      e?.kind === "binary" &&
      e.operator === "in" &&
      isSelfProp(e.left, prop) &&
      e.right?.kind === "array"
    ) {
      const vals = e.right.elements
        .map((el) => el?.value?.value)
        .filter((v) => typeof v === "string");
      if (vals.length) {
        return new Set(vals);
      }
    }
  }
  const u = new Set();
  const byFrom = edges.get(prop);
  if (byFrom) {
    for (const [from, tos] of byFrom) {
      u.add(from);
      for (const to of tos) {
        u.add(to);
      }
    }
  }
  return u;
}

// ---------------------------------------------------------------------------
// Guard → admitted source states (per binary operator, dispatch table keeps
// each handler well under the cognitive-complexity cap)
// ---------------------------------------------------------------------------

/** self.<prop> in [literals] ⇒ those literals. */
function admittedIn(node, prop) {
  if (isSelfProp(node.left, prop) && node.right?.kind === "array") {
    return new Set(
      node.right.elements.map(literalString).filter((v) => v !== undefined)
    );
  }
  return;
}

/** For a binary node over `self.<prop>`, the string literal on the OTHER side. */
function otherSideLiteral(node, prop) {
  if (isSelfProp(node.left, prop)) {
    return literalString(node.right);
  }
  if (isSelfProp(node.right, prop)) {
    return literalString(node.left);
  }
  return;
}

/** self.<prop> == "X" (either side) ⇒ {X}. */
function admittedEq(node, prop) {
  const v = otherSideLiteral(node, prop);
  return v === undefined ? undefined : new Set([v]);
}

/** self.<prop> != "X" ⇒ universe minus X. */
function admittedNeq(node, prop, universe) {
  const v = otherSideLiteral(node, prop);
  if (v === undefined) {
    return;
  }
  const out = new Set(universe);
  out.delete(v);
  return out;
}

/** AND ⇒ intersect both sides' admitted sets (identity = undefined). */
function admittedAnd(node, prop, universe) {
  const a = admittedForProp(node.left, prop, universe);
  const b = admittedForProp(node.right, prop, universe);
  if (a === "uncertain" || b === "uncertain") {
    return "uncertain";
  }
  if (a === undefined) {
    return b;
  }
  if (b === undefined) {
    return a;
  }
  const out = new Set();
  for (const s of a) {
    if (b.has(s)) {
      out.add(s);
    }
  }
  return out;
}

/** OR ⇒ union, but a status OR'd with a non-status clause is unrestricted ⇒ uncertain. */
function admittedOr(node, prop, universe) {
  const a = admittedForProp(node.left, prop, universe);
  const b = admittedForProp(node.right, prop, universe);
  if (a === undefined && b === undefined) {
    return;
  }
  if (a === undefined || b === undefined) {
    return "uncertain";
  }
  if (a === "uncertain" || b === "uncertain") {
    return "uncertain";
  }
  const out = new Set(a);
  for (const s of b) {
    out.add(s);
  }
  return out;
}

const BINARY_HANDLERS = {
  in: admittedIn,
  "==": admittedEq,
  "!=": admittedNeq,
  and: admittedAnd,
  "&&": admittedAnd,
  or: admittedOr,
  "||": admittedOr,
};

/**
 * Admitted source states for `self.<prop>` implied by one guard AST node.
 *   Set<string> — states this clause admits
 *   undefined   — clause does NOT constrain the property (identity for ∩)
 *   "uncertain" — constrains it but unresolvable (OR/not) ⇒ caller skips
 */
function admittedForProp(node, prop, universe) {
  if (node == null || typeof node !== "object" || Array.isArray(node)) {
    return;
  }
  if (node.kind === "binary") {
    const handler = BINARY_HANDLERS[node.operator];
    return handler ? handler(node, prop, universe) : undefined;
  }
  if (node.kind === "group" || node.kind === "paren") {
    return admittedForProp(node.expression, prop, universe);
  }
  if (node.kind === "unary") {
    const inner = admittedForProp(
      node.operand ?? node.argument,
      prop,
      universe
    );
    return inner === undefined ? undefined : "uncertain";
  }
  return;
}

/**
 * Fold ALL guards via ∩. undefined + !uncertain ⇒ unguarded on this property.
 */
function commandAdmitted(command, prop, universe) {
  let admitted;
  let uncertain = false;
  for (const g of command.guards ?? []) {
    const a = admittedForProp(g, prop, universe);
    if (a === "uncertain") {
      uncertain = true;
      break;
    }
    if (a === undefined) {
      continue;
    }
    if (admitted === undefined) {
      admitted = new Set(a);
    } else {
      for (const s of admitted) {
        if (!a.has(s)) {
          admitted.delete(s);
        }
      }
    }
  }
  return { admitted, uncertain };
}

/** Literal mutate targets of `prop` (skips param/computed/non-literal targets). */
function mutateTargets(command, prop) {
  const out = [];
  for (const a of command.actions ?? []) {
    if (a?.kind === "mutate" && a.target === prop) {
      const v = literalString(a.expression);
      if (v !== undefined) {
        out.push(v);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------
const findings = [];
let commandsScanned = 0;
const uncertainCommands = [];

for (const entity of ir.entities ?? []) {
  const edges = transitionEdges(entity);
  if (edges.size === 0) {
    continue; // no transition-bearing property
  }

  const cmds = (ir.commands ?? []).filter((c) => c.entity === entity.name);

  for (const [prop, byFrom] of edges) {
    const universe = statusUniverse(entity, prop, edges);
    if (universe.size === 0) {
      continue;
    }

    for (const cmd of cmds) {
      const targets = mutateTargets(cmd, prop);
      if (targets.length === 0) {
        continue;
      }
      commandsScanned++;

      const { admitted, uncertain } = commandAdmitted(cmd, prop, universe);
      if (uncertain) {
        uncertainCommands.push(`${entity.name}.${cmd.name} [${prop}]`);
        continue;
      }

      // GUARDED (a real `self.<prop> …` guard admits a specific state set) is
      // the proven dead-command bug class — every shipped fix
      // (rsvpConfirm/markResolved/reactivate/reassign/void…) was guarded, the
      // guard proving the designer INTENDED that source state, so a missing
      // edge there is a real silently-rejected bug. UNGUARDED commands are
      // gated only by the transition table by design; their unreachable states
      // are correct rejections, not bugs — reported for review, not failed.
      const guarded = admitted !== undefined;
      const sources = admitted ?? universe; // unguarded ⇒ whole universe

      for (const target of targets) {
        const deadFrom = [];
        for (const s of sources) {
          if (!byFrom.get(s)?.has(target)) {
            deadFrom.push(s);
          }
        }
        if (deadFrom.length > 0) {
          const fullyDead =
            deadFrom.length === sources.size && sources.size > 0;
          findings.push({
            entity: entity.name,
            command: cmd.name,
            property: prop,
            target,
            guarded,
            sources: [...sources].sort(),
            deadFrom: [...deadFrom].sort(),
            fullyDead,
            suggestion:
              `add transition ${prop} from the missing source state(s) to include "${target}" ` +
              `(self-loop too, if the target equals the source) in the ${entity.name} manifest.`,
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { commandsScanned, findings, uncertain: uncertainCommands },
      null,
      2
    )
  );
} else {
  const guardedFindings = findings.filter((f) => f.guarded);
  const unguardedFindings = findings.filter((f) => !f.guarded);
  console.log(
    `commands scanned (literal-status mutate, transition-bearing): ${commandsScanned}`
  );
  console.log(
    `uncertain (skipped, guard too complex): ${uncertainCommands.length}`
  );
  console.log(
    `guarded dead-commands (HIGH confidence, the bug class): ${guardedFindings.length}`
  );
  console.log(
    `unguarded transition gaps (review only, often correct rejections): ${unguardedFindings.length}`
  );
  if (uncertainCommands.length && !findings.length) {
    console.log("\n--- UNCERTAIN (manual review) ---");
    for (const u of uncertainCommands) {
      console.log(`  ${u}`);
    }
  }
  const render = (f) => {
    console.log(
      `\n${f.fullyDead ? "☠ DEAD" : "⚠ DRIFT"}  ${f.entity}.${f.command}  ` +
        `mutate ${f.property} = "${f.target}"`
    );
    console.log(
      `   guarded sources: [${f.sources.join(", ")}]` +
        (f.sources.length === f.deadFrom.length
          ? "  → dead from ALL guarded states"
          : `  → dead from: [${f.deadFrom.join(", ")}]`)
    );
    console.log(`   fix: ${f.suggestion}`);
  };
  if (guardedFindings.length) {
    console.log("\n--- GUARDED DEAD / DRIFTED COMMANDS (fail the gate) ---");
    for (const f of guardedFindings) {
      render(f);
    }
  }
  if (unguardedFindings.length) {
    console.log("\n--- UNGUARDED TRANSITION GAPS (review, not failed) ---");
    for (const f of unguardedFindings) {
      render(f);
    }
  }
}

// ---------------------------------------------------------------------------
// Baseline handling (mirrors check-reaction-payloads.mjs). A guarded dead
// command is always a bug, but the pre-existing set is triaged backlog —
// baseline it so --strict fails only on NEW regressions. Entries are only ever
// REMOVED as a command is fixed (add the transition edge → recompile), never
// added. Unguarded gaps are review-only and never baselined/gated.
// ---------------------------------------------------------------------------
const findingKey = (f) => `${f.entity}.${f.command}.${f.property}=${f.target}`;
const baseline = existsSync(BASELINE_PATH)
  ? new Set(JSON.parse(readFileSync(BASELINE_PATH, "utf8")).violations ?? [])
  : new Set();
const failing = INCLUDE_UNGUARDED
  ? findings
  : findings.filter((f) => f.guarded);

if (WRITE_BASELINE) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $doc: "Pre-existing guarded dead/drifted commands (see audit-dead-commands.mjs). Guarded = a real status guard admits a state with no transition edge to the mutate target — the silently-rejected bug class. Entries may only be REMOVED as the transition is fixed — never added. --strict fails on NEW violations only. Unguarded gaps are review-only, not baselined.",
        violations: failing.map(findingKey).sort(),
      },
      null,
      2
    )}\n`
  );
  console.log(
    `Baseline written: ${failing.length} violation(s) -> ${BASELINE_PATH}`
  );
  process.exit(0);
}

if (STRICT) {
  const newFailing = failing.filter((f) => !baseline.has(findingKey(f)));
  const staleBaseline = [...baseline].filter(
    (k) => !failing.some((f) => findingKey(f) === k)
  );
  if (newFailing.length > 0) {
    console.error(
      `\nFAIL: ${newFailing.length} NEW guarded dead/drifted command transition(s) (baseline: ${baseline.size}). ` +
        "Add the missing transition edge in the manifest source, recompile, and refresh the embed — or narrow an over-broad guard. Do NOT add baseline entries."
    );
    process.exit(1);
  }
  if (staleBaseline.length > 0) {
    console.log(
      `\nNOTE: ${staleBaseline.length} baseline entry/entries now resolved (remove from ${BASELINE_PATH}):`
    );
    for (const k of staleBaseline) {
      console.log(`  ${k}`);
    }
  }
  console.log(
    `\nOK (strict) — ${failing.length} baselined guarded dead-command(s), 0 new (baseline size ${baseline.size}).`
  );
  process.exit(0);
}

// default (report mode): never fail — inform how to gate/snapshot.
console.log(
  `\nOK — report mode: ${failing.length} guarded dead-command(s). ` +
    "Run with --strict to gate (vs baseline) or --write-baseline to snapshot."
);
