#!/usr/bin/env node
/**
 * Validates that GitHub Actions workflows use versions matching the source of truth:
 * - pnpm version from package.json "packageManager" field
 * - Node.js version from package.json "engines.node" field (or .nvmrc)
 * 
 * Prevents version mismatches between local dev, CI, and Vercel production.
 * 
 * Exit codes:
 *   0 = All versions match
 *   1 = Version mismatch found
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract pnpm version from package.json
function getPnpmVersion() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  if (!pkg.packageManager) {
    console.error('❌ package.json missing "packageManager" field');
    process.exit(1);
  }
  
  const match = pkg.packageManager.match(/pnpm@([\d.]+)/);
  if (!match) {
    console.error('❌ Could not parse pnpm version from packageManager field');
    process.exit(1);
  }
  
  return match[1];
}

// Extract Node.js version from package.json engines or .nvmrc
function getNodeVersion() {
  // Try .nvmrc first
  const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
  if (fs.existsSync(nvmrcPath)) {
    return fs.readFileSync(nvmrcPath, 'utf-8').trim().replace(/^v/, '');
  }
  
  // Fall back to package.json engines.node
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  if (pkg.engines?.node) {
    // Extract major version from >=18 or 20.x etc
    const match = pkg.engines.node.match(/(\d+)/);
    if (match) {
      return match[1]; // Return just major version for flexibility
    }
  }
  
  return null;
}

// Find all GitHub Actions workflows
function getWorkflowFiles() {
  const workflowDir = path.join(__dirname, '..', '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) {
    return [];
  }
  
  return fs.readdirSync(workflowDir)
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map(f => path.join(workflowDir, f));
}

// Validate pnpm versions
function validatePnpmVersions(expectedVersion) {
  const workflows = getWorkflowFiles();
  let hasErrors = false;
  
  workflows.forEach(workflowPath => {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    
    // Look for pnpm/action-setup with version: X
    const versionMatches = content.match(/pnpm\/action-setup@[^\n]*\n\s*with:\s*\n\s*version:\s*([^\n]+)/g);
    
    if (versionMatches) {
      versionMatches.forEach(match => {
        const versionLine = match.match(/version:\s*([^\n]+)/);
        if (versionLine) {
          const version = versionLine[1].trim();
          if (version !== expectedVersion) {
            console.error(
              `❌ ${path.relative(process.cwd(), workflowPath)}: ` +
              `pnpm version mismatch - found "${version}", expected "${expectedVersion}"`
            );
            hasErrors = true;
          }
        }
      });
    }
  });
  
  return !hasErrors;
}

// Validate Node.js versions
function validateNodeVersions(expectedVersion) {
  if (!expectedVersion) return true; // Skip if not specified
  
  const workflows = getWorkflowFiles();
  let hasErrors = false;
  
  workflows.forEach(workflowPath => {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    
    // Look for setup-node with node-version: X
    const versionMatches = content.match(/setup-node@[^\n]*\n\s*with:\s*\n\s*node-version:\s*['"]?([^'"\n]+)['"]?/g);
    
    if (versionMatches) {
      versionMatches.forEach(match => {
        const versionLine = match.match(/node-version:\s*['"]?([^'"\n]+)['"]?/);
        if (versionLine) {
          const version = versionLine[1].trim();
          // Extract major version from version strings like "20", "20.x", "20.11.0"
          const majorVersion = version.match(/^(\d+)/)?.[1];
          
          if (majorVersion && majorVersion !== expectedVersion) {
            console.error(
              `❌ ${path.relative(process.cwd(), workflowPath)}: ` +
              `Node.js version mismatch - found "${version}", expected major version "${expectedVersion}"`
            );
            hasErrors = true;
          }
        }
      });
    }
  });
  
  return !hasErrors;
}

// Main
const expectedPnpmVersion = getPnpmVersion();
const expectedNodeVersion = getNodeVersion();

console.log(`✓ Validating workflow versions...`);
console.log(`  - pnpm@${expectedPnpmVersion} (from package.json packageManager)`);
if (expectedNodeVersion) {
  console.log(`  - Node.js ${expectedNodeVersion} (from package.json engines or .nvmrc)`);
}

const pnpmValid = validatePnpmVersions(expectedPnpmVersion);
const nodeValid = validateNodeVersions(expectedNodeVersion);

if (pnpmValid && nodeValid) {
  console.log('✓ All workflow versions match configuration');
  process.exit(0);
} else {
  console.error('\n❌ Version mismatch detected in .github/workflows/*.yml');
  console.error('Fix by updating hardcoded versions to match package.json and .nvmrc');
  process.exit(1);
}
