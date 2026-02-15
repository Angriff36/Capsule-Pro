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

    // Check pnpm version (only if explicitly specified in workflow)
    const pnpmMatch = content.match(/version:\s*(\d+\.\d+\.\d+)/);
    if (pnpmMatch) {
      // Only check if version is explicitly set (it's optional when packageManager is in package.json)
      if (pnpmMatch[1] !== expectedPnpmVersion) {
        console.error(`pnpm version mismatch in ${workflowFile}: expected ${expectedPnpmVersion}, found ${pnpmMatch[1]}`);
        hasErrors = true;
      }
    }
    // If no pnpm version specified, that's fine - it will use packageManager from package.json

    // Check node version (handle version ranges like >=20.0.0 and 20.x)
    const nodeMatch = content.match(/node-version:\s*'([^']+)'/);
    if (nodeMatch) {
      const workflowNodeVersion = nodeMatch[1];
      // If expectedNodeVersion is a range (e.g., >=20.0.0), check if workflow version satisfies it
      if (expectedNodeVersion.startsWith('>=')) {
        const minVersion = expectedNodeVersion.replace('>=', '').trim();
        const workflowMajor = parseInt(workflowNodeVersion.split('.')[0], 10);
        const minMajor = parseInt(minVersion.split('.')[0], 10);
        if (workflowMajor < minMajor) {
          console.error(`Node.js version mismatch in ${workflowFile}: expected ${expectedNodeVersion}, found ${workflowNodeVersion}`);
          hasErrors = true;
        }
      } else if (expectedNodeVersion.endsWith('.x')) {
        // Handle 20.x format - check if workflow version matches the major version
        const expectedMajor = parseInt(expectedNodeVersion.replace('.x', ''), 10);
        const workflowMajor = parseInt(workflowNodeVersion.split('.')[0], 10);
        if (workflowMajor !== expectedMajor) {
          console.error(`Node.js version mismatch in ${workflowFile}: expected ${expectedNodeVersion}, found ${workflowNodeVersion}`);
          hasErrors = true;
        }
      } else if (nodeMatch[1] !== expectedNodeVersion) {
        console.error(`Node.js version mismatch in ${workflowFile}: expected ${expectedNodeVersion}, found ${nodeMatch[1]}`);
        hasErrors = true;
      }
    }
  } catch (error) {
    // Skip if file doesn't exist
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('Version validation passed');