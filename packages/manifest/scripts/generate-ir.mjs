#!/usr/bin/env node

import { compileToIR } from '../src/manifest/ir-compiler.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(join(__dirname, '../src/manifest/conformance/fixtures/41-preptask-claim.manifest'), 'utf-8');
const { ir } = await compileToIR(source);

writeFileSync(join(__dirname, '../src/manifest/conformance/expected/41-preptask-claim.ir.json'), JSON.stringify(ir, null, 2));
console.log('IR generated successfully');
