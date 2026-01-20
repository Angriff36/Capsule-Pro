#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';

const packageJsonPath = join(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const expectedPnpmVersion = packageJson.packageManager?.replace('pnpm@', '');
const expectedNodeVersion = packageJson.engines?.node;

if (!expectedPnpmVersion) {
  console.error('packageManager not found in package.json');
  process.exit(1);
}

if (!expectedNodeVersion) {
  console.error('engines.node not found in package.json');
  process.exit(1);
}

const workflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  '.github/workflows/performance.yml',
  '.github/workflows/security.yml',
  '.github/workflows/vercel-compat.yml'
];

let hasErrors = false;

for (const workflowFile of workflowFiles) {
  try {
    const content = readFileSync(join(process.cwd(), workflowFile), 'utf8');

    // Check pnpm version
    const pnpmMatch = content.match(/version:\s*(\d+\.\d+\.\d+)/);
    if (pnpmMatch && pnpmMatch[1] !== expectedPnpmVersion) {
      console.error(`pnpm version mismatch in ${workflowFile}: expected ${expectedPnpmVersion}, found ${pnpmMatch[1]}`);
      hasErrors = true;
    }

    // Check node version
    const nodeMatch = content.match(/node-version:\s*'([^']+)'/);
    if (nodeMatch && nodeMatch[1] !== expectedNodeVersion) {
      console.error(`Node.js version mismatch in ${workflowFile}: expected ${expectedNodeVersion}, found ${nodeMatch[1]}`);
      hasErrors = true;
    }
  } catch (error) {
    // Skip if file doesn't exist
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('Version validation passed');