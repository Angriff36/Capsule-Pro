#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
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
const { ir } = await compileToIR(source);

writeFileSync(
  join(
    __dirname,
    "../src/manifest/conformance/expected/41-preptask-claim.ir.json"
  ),
  JSON.stringify(ir, null, 2)
);
console.log("IR generated successfully");
