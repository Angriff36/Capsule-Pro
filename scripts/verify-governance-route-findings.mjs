#!/usr/bin/env node

/**
 * Governance Route Verification
 *
 * Runs `manifest audit-routes` and reports findings summary.
 * Exit 0 if audit passes (no errors).
 * Exit 1 if errors found (with summary).
 *
 * Usage:
 *   pnpm governance:verify-routes
 */

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = new URL("..", import.meta.url).pathname;

// ANSI colors
const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function log(msg, color = "reset") {
  console.log(`${C[color]}${msg}${C.reset}`);
}

// ── Run audit → temp file ──────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), "gov-verify-"));
const outFile = join(tmp, "audit.json");

const AUDIT_CMD = [
  "pnpm",
  "exec",
  "manifest",
  "audit-routes",
  "--root",
  "apps/api",
  "--format",
  "json",
  "--commands-manifest",
  "packages/manifest-ir/dist/commands.registry.json",
  "--exemptions",
  "packages/manifest-ir/ir/kitchen/audit-routes-exemptions.json",
  ">",  outFile,
  "2>/dev/null",
].join(" ");

try {
  execSync(AUDIT_CMD, { cwd: ROOT, encoding: "utf8", shell: "/bin/bash" });
} catch {
  // audit-routes exits non-zero when findings exist — that's expected
}

// ── Parse results ──────────────────────────────────────────────────────
let result;
try {
  const raw = readFileSync(outFile, "utf8");
  // Strip any non-JSON prefix lines (pnpm WARN, blank lines)
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON found in output");
  }
  result = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));
} catch (err) {
  log(`Failed to read/parse audit output: ${err.message}`, "red");
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
  process.exit(1);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}

const findings = Array.isArray(result.findings) ? result.findings : [];
const totalFiles = result.filesAudited ?? "unknown";

const errors = findings.filter((f) => f.severity === "error");
const warnings = findings.filter((f) => f.severity === "warning");

// ── Summarize by rule ─────────────────────────────────────────────────
const errorByRule = {};
for (const e of errors) {
  const rule = e.code || "UNKNOWN";
  errorByRule[rule] = (errorByRule[rule] || 0) + 1;
}

const warnByRule = {};
for (const w of warnings) {
  const rule = w.code || "UNKNOWN";
  warnByRule[rule] = (warnByRule[rule] || 0) + 1;
}

// ── Report ─────────────────────────────────────────────────────────────
log(`\n${C.bold}Governance Route Verification${C.reset}`);
log(`${"─".repeat(40)}`);
log(`Route files audited: ${totalFiles}`);
log(`Errors:   ${errors.length}`, errors.length > 0 ? "red" : "green");
log(`Warnings: ${warnings.length}`, warnings.length > 0 ? "yellow" : "green");

if (Object.keys(errorByRule).length > 0) {
  log(`\n${C.bold}Errors by rule:${C.reset}`);
  for (const [rule, count] of Object.entries(errorByRule).sort(
    (a, b) => b[1] - a[1]
  )) {
    log(`  ${C.red}✗${C.reset} ${rule}: ${count}`);
  }
}

if (Object.keys(warnByRule).length > 0) {
  log(`\n${C.bold}Warnings by rule:${C.reset}`);
  for (const [rule, count] of Object.entries(warnByRule).sort(
    (a, b) => b[1] - a[1]
  )) {
    log(`  ${C.yellow}⚠${C.reset} ${rule}: ${count}`);
  }
}

// ── Verdict ────────────────────────────────────────────────────────────
if (errors.length > 0) {
  log(
    `\n${C.red}${C.bold}FAIL${C.reset} — ${errors.length} error(s) found. ` +
      `Run ${C.dim}pnpm manifest:route-audit${C.reset} for details.`,
    "red"
  );
  process.exit(1);
}

log(`\n${C.green}${C.bold}PASS${C.reset} — No errors found.`, "green");
process.exit(0);
