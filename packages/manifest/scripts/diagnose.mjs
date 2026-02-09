#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileToIR } from "../src/manifest/ir-compiler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(
  join(
    __dirname,
    "../src/manifest/conformance/fixtures/41-preptask-claim.manifest"
  ),
  "utf-8"
);
const { ir, diagnostics } = await compileToIR(source);

console.log("IR:", ir);
console.log("\nDiagnostics:", JSON.stringify(diagnostics, null, 2));
