#!/usr/bin/env node

/**
 * Skip CI script for Vercel deployments
 * Returns exit code 0 to allow build, or 1 to skip
 *
 * This is called by Vercel's ignoreCommand in vercel.json
 */

// Get environment variables
const branch = process.env.VERCEL_GIT_COMMIT_REF || '';
const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || '';

// Always build main/master branches
if (branch === 'main' || branch === 'master') {
  console.log('[skip-ci] Building main branch');
  process.exit(0);
}

// Skip if commit message contains [skip ci] or [ci skip]
if (commitMessage.match(/\[(skip ci|ci skip)\]/i)) {
  console.log('[skip-ci] Commit message contains skip directive');
  process.exit(1);
}

// Build by default
console.log('[skip-ci] Proceeding with build');
process.exit(0);
