#!/usr/bin/env node
/**
 * build-live-schema — regenerate packages/database/prisma/schema.prisma from the
 * Manifest IR + the preserved infra/core partial.
 *
 * The live schema is a HYBRID by design (per https://manifest-b1e8623f.mintlify.app/integration/prisma:
 * the Prisma projection deliberately has "no app coupling" — infra/plumbing tables like the outbox,
 * idempotency, audit, webhooks, and the tenant/org/auth backbone must live OUTSIDE Manifest entities):
 *
 *   live schema = [Capsule generator+datasource header]
 *               + [domain models projected FROM manifest/ir/kitchen.ir.json]
 *               + [preserved INFRA + CORE models from manifest/schema-partials/infra-core.prisma]
 *
 * The installed @angriff36/manifest CLI bin exposes only the `nextjs` projection
 * ("Unknown projection: prisma"), so the Prisma projection is invoked programmatically via the
 * PrismaProjection class — the docs sanction this ("call the projection API programmatically in a
 * build script"; /integration/prisma "Programmatic usage"). Single-schema, relationMode="prisma".
 *
 * As DOMAIN entities are authored into manifest/source/*.manifest, they move from the infra-core
 * partial (delete them there) into the generated set automatically. Run after any source change.
 *
 * Usage: node manifest/scripts/build-live-schema.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const projPath = resolve(
  root,
  "manifest/runtime/node_modules/@angriff36/manifest/dist/manifest/projections/prisma/generator.js",
);
const irPath = resolve(root, "manifest/ir/kitchen.ir.json");
const partialPath = resolve(root, "manifest/schema-partials/infra-core.prisma");
const dest = resolve(root, "packages/database/prisma/schema.prisma");

const projMod = await import(pathToFileURL(projPath).href);
const PrismaProjection = projMod.PrismaProjection || projMod.default;
const ir = JSON.parse(readFileSync(irPath, "utf8"));

const result = new PrismaProjection().generate(ir, {
  surface: "prisma.schema",
  options: {
    // no provider → model blocks only; Capsule owns the header below.
    // `signature` became a reserved word in @angriff36/manifest 2.0, so the IR
    // property was renamed Shipment.signature → Shipment.signatureData. Map it
    // back to the existing physical column `signature` so the dev DB and the
    // raw-SQL writers in apps/api/app/api/shipments/** keep working (no migration).
    columnMappings: { Shipment: { signatureData: "signature" } },
  },
});
const arts = result.artifacts || [];
const schemaArt =
  arts.find((a) => (a.pathHint || "").endsWith(".prisma") || a.id === "prisma.schema") ||
  arts[0];
const diags = result.diagnostics || [];
const byCode = {};
for (const d of diags) byCode[d.code] = (byCode[d.code] || 0) + 1;

// keep only model/enum/type blocks from the projection output (strip any datasource/generator)
const code = schemaArt.code;
const firstBlock = code.search(/^(model|enum|type) /m);
const generatedModels = firstBlock >= 0 ? code.slice(firstBlock) : code;

const header = `// ============================================================================
// schema.prisma — HYBRID (generated domain + preserved infra/core).
// DOMAIN MODELS below are GENERATED FROM MANIFEST IR — DO NOT EDIT BY HAND.
// Regenerate: node manifest/scripts/build-live-schema.mjs
// Domain source: manifest/source/*.manifest -> manifest/ir/kitchen.ir.json
// Infra/core partial: manifest/schema-partials/infra-core.prisma (maintained separately,
//   per /integration/prisma — infra tables live outside Manifest entities).
// ============================================================================

generator client {
  provider               = "prisma-client"
  output                 = "../generated"
  moduleFormat           = "esm"
  generatedFileExtension = "ts"
  importFileExtension    = "ts"
}

datasource db {
  provider     = "postgresql"
  relationMode = "prisma"
}

`;

const partial = readFileSync(partialPath, "utf8").replace(/^﻿/, "");
const out =
  header +
  generatedModels.replace(/\s*$/, "") +
  "\n\n// ===== PRESERVED NON-IR INFRASTRUCTURE + CORE TABLES =====\n\n" +
  partial.replace(/\s*$/, "") +
  "\n";

writeFileSync(dest, out);
const modelCount = (out.match(/^model /gm) || []).length;
const partialModels = (partial.match(/^model /gm) || []).length;
process.stdout.write(
  `projection diagnostics: ${JSON.stringify(byCode)}\n` +
    `wrote ${dest}\n` +
    `models: ${modelCount} (${modelCount - partialModels} generated + ${partialModels} preserved)\n`,
);
