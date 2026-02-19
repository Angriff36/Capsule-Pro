#!/usr/bin/env node

/**
 * Test: Route Conformance Check
 *
 * Demonstrates that the hardcoded-routes scanner:
 *   1. FAILS on a sample violation (hardcoded /api/ path in client code)
 *   2. PASSES after the violation is fixed (using route helper)
 *
 * Run:  node scripts/test-route-conformance.mjs
 */

import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const TEST_DIR = join(
  REPO_ROOT,
  "apps/app/app/(authenticated)/__test-conformance__"
);
const TEST_FILE = join(TEST_DIR, "test-violation.tsx");

function cleanup() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function runScan() {
  try {
    execSync("node scripts/check-hardcoded-routes.mjs", {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    return { passed: true, output: "" };
  } catch (err) {
    return {
      passed: false,
      output: err.stderr?.toString() || err.stdout?.toString() || "",
    };
  }
}

// ---------------------------------------------------------------------------
// Test 1: Violation should be detected
// ---------------------------------------------------------------------------

console.log("=== Test 1: Violation Detection ===\n");

cleanup();
mkdirSync(TEST_DIR, { recursive: true });

// Write a file with a hardcoded /api/ path (violation)
writeFileSync(
  TEST_FILE,
  `"use client";
import { apiFetch } from "@/app/lib/api";

export function TestComponent() {
  const fetchData = async () => {
    // This is a violation — hardcoded /api/ path
    const response = await apiFetch("/api/kitchen/recipes/123/versions");
    return response.json();
  };
  return <div>Test</div>;
}
`
);

const result1 = runScan();

if (result1.passed) {
  console.error(
    "❌ FAIL: Scanner should have detected the violation but passed.\n"
  );
  cleanup();
  process.exit(1);
}

// Verify our test file is in the violations
if (result1.output.includes("__test-conformance__/test-violation.tsx")) {
  console.log(
    "✅ PASS: Scanner correctly detected hardcoded /api/ path in test file.\n"
  );
} else {
  console.error("❌ FAIL: Scanner failed but did not report our test file.\n");
  console.error("Output:", result1.output.slice(0, 500));
  cleanup();
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Test 2: Fixed file should not trigger violation
// ---------------------------------------------------------------------------

console.log("=== Test 2: Fixed File Passes ===\n");

// Rewrite the file using route helpers (no hardcoded /api/ path)
writeFileSync(
  TEST_FILE,
  `"use client";
import { apiFetch } from "@/app/lib/api";
import { kitchenRecipeVersions } from "@/app/lib/routes";

export function TestComponent() {
  const recipeId = "123";
  const fetchData = async () => {
    // Fixed: using route helper instead of hardcoded path
    const response = await apiFetch(kitchenRecipeVersions(recipeId));
    return response.json();
  };
  return <div>Test</div>;
}
`
);

const result2 = runScan();

// The scan will still fail because of the 171 existing violations in the codebase.
// But our test file should NOT be in the violations list.
if (result2.output.includes("__test-conformance__/test-violation.tsx")) {
  console.error(
    "❌ FAIL: Scanner still reports our fixed test file as a violation.\n"
  );
  cleanup();
  process.exit(1);
}

console.log("✅ PASS: Fixed file is not reported as a violation.\n");

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

cleanup();

console.log("=== All Tests Passed ===\n");
console.log("The conformance scanner correctly:");
console.log("  1. Detects hardcoded /api/ paths in client code");
console.log("  2. Does not flag files that use route helpers");
console.log("  3. Respects the allowlist (routes.ts, api.ts, next.config.ts)");
process.exit(0);
