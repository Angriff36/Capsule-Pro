#!/usr/bin/env node

/**
 * Manifest Validation Script
 *
 * Run this script locally to validate manifest files before pushing.
 * This script mimics the CI checks in .github/workflows/manifest-ci.yml
 *
 * Usage:
 *   node scripts/validate-manifests.mjs
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MANIFEST_DIR = "packages/kitchen-ops/manifests";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.bold}${colors.blue}Step ${step.number}: ${step.title}${colors.reset}`);
}

function logSuccess(message) {
  log(`  ${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  log(`  ${colors.red}✗${colors.reset} ${message}`);
}

function logWarning(message) {
  log(`  ${colors.yellow}⚠${colors.reset} ${message}`);
}

function runCommand(command, { cwd, ignoreStderr = false } = {}) {
  try {
    const options = { cwd, stdio: "pipe" };
    const result = execSync(command, options);
    return { success: true, output: result.toString() };
  } catch (error) {
    if (!ignoreStderr || !error.stderr?.toString().includes("Warning:")) {
      return {
        success: false,
        output: error.stdout?.toString() || "",
        error: error.stderr?.toString() || error.message,
      };
    }
    return { success: true, output: error.stdout?.toString() || "" };
  }
}

// Step 1: Check if manifest directory exists
function checkManifestDirectory() {
  logStep({ number: 1, title: "Check manifest directory" });

  if (!existsSync(MANIFEST_DIR)) {
    logError(`Manifest directory not found: ${MANIFEST_DIR}`);
    return false;
  }

  const files = readdirSync(MANIFEST_DIR).filter((f) => f.endsWith(".manifest"));
  if (files.length === 0) {
    logWarning("No manifest files found");
    return false;
  }

  logSuccess(`Found ${files.length} manifest file(s)`);
  files.forEach((f) => log(`    - ${f}`));
  return true;
}

// Step 2: Validate manifest compilation
function validateManifests() {
  logStep({ number: 2, title: "Validate manifest compilation" });

  const files = readdirSync(MANIFEST_DIR).filter((f) => f.endsWith(".manifest"));
  let allValid = true;

  for (const file of files) {
    const manifestPath = join(MANIFEST_DIR, file);
    log(`  Checking ${file}...`);

    const result = runCommand(
      `npx tsx packages/manifest/bin/compile.ts "${manifestPath}" --output /tmp/manifest-check-${Date.now()}`,
      { ignoreStderr: true }
    );

    if (result.success) {
      logSuccess(`${file} compiled successfully`);
    } else {
      logError(`${file} failed to compile`);
      if (result.error) {
        log(`    Error: ${result.error.split("\n").slice(0, 3).join("\n    ")}`);
      }
      allValid = false;
    }
  }

  return allValid;
}

// Step 3: Run conformance tests
function runConformanceTests() {
  logStep({ number: 3, title: "Run conformance tests" });

  log("  Running manifest package tests...");
  const result = runCommand("pnpm test -- --run", { cwd: "packages/manifest" });

  if (result.success) {
    logSuccess("Conformance tests passed");
    return true;
  } else {
    logError("Conformance tests failed");
    log(`    ${result.output.split("\n").slice(-5).join("\n    ")}`);
    return false;
  }
}

// Step 4: Run integration tests
function runIntegrationTests() {
  logStep({ number: 4, title: "Run integration tests" });

  log("  Running kitchen integration tests...");
  const result = runCommand("pnpm test __tests__/kitchen/ -- --run", {
    cwd: "apps/api",
  });

  if (result.success) {
    logSuccess("Integration tests passed");
    return true;
  } else {
    logError("Integration tests failed");
    log(`    ${result.output.split("\n").slice(-10).join("\n    ")}`);
    return false;
  }
}

// Step 5: Check generated code is up-to-date
function checkGeneratedCode() {
  logStep({ number: 5, title: "Check generated code is up-to-date" });

  log("  Running pnpm run analyze...");
  const result = runCommand("pnpm run analyze");

  if (result.success) {
    logSuccess("Code generation completed");
  } else {
    logError("Code generation failed");
    log(`    ${result.output.split("\n").slice(-5).join("\n    ")}`);
    return false;
  }

  // Check git status
  log("  Checking for uncommitted changes...");
  const gitResult = runCommand("git diff --name-only");

  if (gitResult.success && gitResult.output.trim() === "") {
    logSuccess("Generated code is up-to-date");
    return true;
  } else {
    logWarning("Generated code has uncommitted changes");
    log("    Changed files:");
    gitResult.output
      .trim()
      .split("\n")
      .forEach((f) => log(`      - ${f}`));
    log("\n    Run the following to update:");
    log("      git add apps/api/app/api/kitchen/");
    log('      git commit -m "feat: regenerate manifest-generated routes"');
    return false;
  }
}

// Step 6: TypeScript check
function runTypeScriptCheck() {
  logStep({ number: 6, title: "TypeScript compilation check" });

  log("  Running pnpm run check...");
  const result = runCommand("pnpm run check");

  if (result.success) {
    logSuccess("TypeScript compilation passed");
    return true;
  } else {
    logError("TypeScript compilation failed");
    log(`    ${result.output.split("\n").slice(-10).join("\n    ")}`);
    return false;
  }
}

// Main function
function main() {
  log(
    `${colors.bold}${colors.blue}Manifest Validation${colors.reset}`,
    "blue"
  );
  log(
    `${colors.blue}======================${colors.reset}\n`,
    "blue"
  );

  const results = {
    manifestDirectory: checkManifestDirectory(),
    conformanceTests: false,
    integrationTests: false,
    generatedCode: false,
    typeScriptCheck: false,
  };

  if (results.manifestDirectory) {
    results.manifestCompilation = validateManifests();
    results.conformanceTests = runConformanceTests();
    results.integrationTests = runIntegrationTests();
    results.generatedCode = checkGeneratedCode();
    results.typeScriptCheck = runTypeScriptCheck();
  }

  // Summary
  log(
    `\n${colors.bold}${colors.blue}Summary${colors.reset}`,
    "blue"
  );
  log(
    `${colors.blue}=======${colors.reset}\n`,
    "blue"
  );

  const allPassed = Object.entries(results).every(([key, value]) => {
    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
    if (value) {
      logSuccess(label);
      return true;
    } else {
      logError(label);
      return false;
    }
  });

  log("");
  if (allPassed) {
    log(`${colors.green}${colors.bold}All checks passed!${colors.reset}`, "green");
    log(
      `${colors.green}You're ready to push your manifest changes.${colors.reset}`,
      "green"
    );
    process.exit(0);
  } else {
    log(`${colors.red}${colors.bold}Some checks failed.${colors.reset}`, "red");
    log(
      `${colors.red}Please fix the issues above before pushing.${colors.reset}`,
      "red"
    );
    log("");
    log(
      `${colors.yellow}For help, see .github/MANIFEST_CI.md${colors.reset}`,
      "yellow"
    );
    process.exit(1);
  }
}

main();
