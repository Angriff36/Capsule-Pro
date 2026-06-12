#!/usr/bin/env node
/**
 * Generates Mermaid diagrams from the compiled Manifest IR using the
 * upstream MermaidProjection.
 *
 * Produces four diagram types:
 *   1. ER diagram          — all 202 entities with properties and 317 relationship edges
 *   2. State diagrams      — 96 entities with 263 transition rules
 *   3. Sequence diagrams   — command execution flows (guards → actions → events)
 *   4. Per-entity ER       — individual entity diagrams for focused reference
 *
 * Usage:
 *   node manifest/scripts/generate-mermaid.mjs              # generate all
 *   node manifest/scripts/generate-mermaid.mjs --er          # ER diagram only
 *   node manifest/scripts/generate-mermaid.mjs --state        # state diagrams only
 *   node manifest/scripts/generate-mermaid.mjs --sequence     # sequence diagrams only
 *   node manifest/scripts/generate-mermaid.mjs --entity Event # single-entity ER
 *
 * Output: manifest/reports/diagrams/
 *
 * Task 5.4 — Mermaid projection for architecture documentation.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");
const OUT_DIR = join(root, "manifest", "reports", "diagrams");

// ── CLI flags ──
const args = process.argv.slice(2);
const flagEr = args.includes("--er");
const flagState = args.includes("--state");
const flagSequence = args.includes("--sequence");
const entityFlag =
  args.find((a) => a.startsWith("--entity="))?.split("=")[1] ||
  args[args.indexOf("--entity") + 1];
const flagAll = !(flagEr || flagState || flagSequence || entityFlag);

// ── Load IR ──
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

// ── Generate using upstream projection ──
const { MermaidProjection } = await import(
  "@angriff36/manifest/projections/mermaid"
);
const projection = new MermaidProjection();

mkdirSync(OUT_DIR, { recursive: true });

let filesWritten = 0;

/**
 * Generate and write a Mermaid diagram.
 * @param {string} surface - Projection surface (mermaid.er, mermaid.state, etc.)
 * @param {object} opts - MermaidProjectionOptions
 * @param {string} filename - Output filename
 * @returns {string} The generated diagram text
 */
function generateDiagram(surface, opts, filename) {
  const result = projection.generate(ir, { surface, options: opts });

  if (result.diagnostics?.length > 0) {
    for (const d of result.diagnostics) {
      if (d.severity === "error") {
        console.error(`  [mermaid] ${d.severity}: ${d.code} — ${d.message}`);
      }
    }
  }

  if (!result.artifacts?.length) {
    console.warn(`  [mermaid] No artifacts for ${surface}. Skipping.`);
    return "";
  }

  const code = result.artifacts[0].code;
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, code);
  filesWritten++;
  return code;
}

// ── ER Diagram (all entities) ──
if (flagAll || flagEr) {
  console.log("[mermaid] Generating ER diagram...");
  const erCode = generateDiagram(
    "mermaid.er",
    {
      markdown: true,
      includeProperties: true,
    },
    "er-diagram.md"
  );

  if (erCode) {
    // Count entities and relationships in output
    const entityCount = (erCode.match(/^\s+[A-Za-z_]\w* \{/gm) || []).length;
    const relCount = (erCode.match(/\}(o|\|\|)--(o|\|\|)/g) || []).length;
    console.log(
      `  ER: ${entityCount} entities, ${relCount} relationship edges`
    );
  }
}

// ── State Diagrams ──
if (flagAll || flagState) {
  console.log("[mermaid] Generating state diagrams...");
  const stateCode = generateDiagram(
    "mermaid.state",
    {
      markdown: true,
    },
    "state-diagrams.md"
  );

  if (stateCode) {
    const diagramCount = (stateCode.match(/stateDiagram-v2/g) || []).length;
    console.log(`  State: ${diagramCount} state machine diagrams`);
  }
}

// ── Sequence Diagrams ──
if (flagAll || flagSequence) {
  console.log("[mermaid] Generating sequence diagrams...");

  // Generate sequence for a representative set of high-value commands
  const targetEntities = [
    "Event",
    "Invoice",
    "Payment",
    "VendorContract",
    "InventoryItem",
    "PurchaseOrder",
    "AdminTask",
    "Shipment",
  ];

  const allSeq = [];
  for (const entityName of targetEntities) {
    const entity = ir.entities.find((e) => e.name === entityName);
    if (!entity) {
      continue;
    }

    const seqCode = generateDiagram(
      "mermaid.sequence",
      {
        markdown: false,
        entity: entityName,
      },
      `sequence-${entityName.toLowerCase()}.md`
    );

    if (seqCode) {
      allSeq.push({ entity: entityName, code: seqCode });
    }
  }

  // Write combined sequence file
  if (allSeq.length > 0) {
    const combined = allSeq
      .map(
        (s) =>
          `## ${s.entity} Command Flow\n\n\`\`\`mermaid\n${s.code}\n\`\`\`\n`
      )
      .join("\n---\n\n");
    writeFileSync(join(OUT_DIR, "sequence-diagrams.md"), combined);
    console.log(`  Sequence: ${allSeq.length} command flow diagrams`);
  }
}

// ── Per-entity ER Diagrams ──
if (entityFlag) {
  const entity = ir.entities.find(
    (e) => e.name.toLowerCase() === entityFlag.toLowerCase()
  );
  if (!entity) {
    console.error(`[mermaid] Entity "${entityFlag}" not found in IR.`);
    console.error(
      `  Available: ${ir.entities
        .slice(0, 20)
        .map((e) => e.name)
        .join(", ")}...`
    );
    process.exit(1);
  }

  console.log(`[mermaid] Generating ER diagram for ${entity.name}...`);
  generateDiagram(
    "mermaid.er",
    {
      markdown: true,
      includeProperties: true,
      entity: entity.name,
    },
    `er-${entity.name.toLowerCase()}.md`
  );

  // Also generate state diagram for this entity if it has transitions
  if (entity.transitions?.length > 0) {
    generateDiagram(
      "mermaid.state",
      {
        markdown: true,
        entity: entity.name,
      },
      `state-${entity.name.toLowerCase()}.md`
    );
  }
}

// ── Summary ──
const entityCount = ir.entities.length;
const relCount = ir.entities.reduce(
  (s, e) => s + (e.relationships?.length || 0),
  0
);
const transCount = ir.entities.reduce(
  (s, e) => s + (e.transitions?.length || 0),
  0
);

console.log(`\n[mermaid] Done. ${filesWritten} file(s) written to ${OUT_DIR}`);
console.log(
  `[mermaid] IR stats: ${entityCount} entities, ${relCount} relationships, ${transCount} transitions, ${ir.commands?.length || 0} commands`
);
