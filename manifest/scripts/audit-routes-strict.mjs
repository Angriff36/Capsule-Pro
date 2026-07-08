#!/usr/bin/env node
/**
 * Strict route audit with extended exemption coverage.
 *
 * Upstream `manifest audit-routes` applies exemptions only to
 * WRITE_OUTSIDE_COMMANDS_NAMESPACE. COMMAND_ROUTE_MISSING_RUNTIME_CALL and
 * COMMAND_ROUTE_ORPHAN ignore the registry (see audit-routes.js in @angriff36/manifest).
 *
 * This wrapper re-runs the audit and suppresses COMMAND_ROUTE_* findings for
 * paths registered in manifest/governance/audit-routes-exemptions.json so
 * legacy hand-written command routes can drain over time without blocking build.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const OWNERSHIP_RULE_CODES = new Set([
  "WRITE_OUTSIDE_COMMANDS_NAMESPACE",
  "COMMAND_ROUTE_MISSING_RUNTIME_CALL",
  "COMMAND_ROUTE_ORPHAN",
]);

const COMMAND_ROUTE_CODES = new Set([
  "COMMAND_ROUTE_MISSING_RUNTIME_CALL",
  "COMMAND_ROUTE_ORPHAN",
]);

const API_ROOT = path.join(PROJECT_ROOT, "apps/api");
const EXEMPTIONS_PATH = path.join(
  PROJECT_ROOT,
  "manifest/governance/audit-routes-exemptions.json"
);
const COMMANDS_MANIFEST = path.join(
  PROJECT_ROOT,
  "manifest/ir/kitchen.commands.json"
);

function loadExemptions() {
  const parsed = JSON.parse(readFileSync(EXEMPTIONS_PATH, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("Exemptions file must be a JSON array");
  }
  return parsed.filter(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      typeof e.path === "string" &&
      Array.isArray(e.methods)
  );
}

function relRoutePath(absFile) {
  const rel = path.relative(API_ROOT, absFile).replace(/\\/g, "/");
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return rel;
}

function exemptionIndex(exemptions) {
  const map = new Map();
  for (const entry of exemptions) {
    map.set(entry.path.replace(/\\/g, "/").toLowerCase(), entry);
  }
  return map;
}

function isCommandRouteExempt(relPath, exemptionByPath) {
  const entry = exemptionByPath.get(relPath.toLowerCase());
  if (!entry) {
    return false;
  }
  return entry.commandRouteExempt === true || entry.category === "infrastructure";
}

function runAuditJson() {
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const outPath = path.join(
    tmpdir(),
    `capsule-audit-routes-${process.pid}.json`
  );
  const args = [
    "exec",
    "manifest",
    "audit-routes",
    "--strict",
    "--root",
    "apps/api",
    "--commands-manifest",
    "manifest/ir/kitchen.commands.json",
    "--exemptions",
    "manifest/governance/audit-routes-exemptions.json",
    "--format",
    "json",
  ];

  const shellCmd =
    process.platform === "win32"
      ? `${bin} ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")} > "${outPath}" 2>nul`
      : `${bin} ${args.map((a) => `'${a.replace(/'/g, `'\\''`)}'`).join(" ")} > '${outPath}' 2>/dev/null`;

  const result = spawnSync(shellCmd, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    shell: true,
  });

  let raw;
  try {
    raw = readFileSync(outPath, "utf8");
  } finally {
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
  }

  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) {
    console.error((result.stderr || "") + raw.slice(0, 2000));
    throw new Error("audit-routes did not emit JSON output");
  }

  let payload;
  try {
    payload = JSON.parse(raw.slice(jsonStart));
  } catch (err) {
    console.error(raw.slice(0, 2000));
    throw new Error(
      `Could not parse audit-routes JSON payload: ${err instanceof Error ? err.message : err}`
    );
  }
  return { payload, exitCode: result.status ?? 1 };
}

function main() {
  const exemptions = loadExemptions();
  const exemptionByPath = exemptionIndex(exemptions);
  const { payload } = runAuditJson();

  const ownershipFindings = payload.findings.filter(
    (f) => f.severity === "error" && OWNERSHIP_RULE_CODES.has(f.code)
  );

  const suppressed = [];
  const blocking = [];

  for (const finding of ownershipFindings) {
    const rel = relRoutePath(finding.file);
    if (
      rel &&
      COMMAND_ROUTE_CODES.has(finding.code) &&
      isCommandRouteExempt(rel, exemptionByPath)
    ) {
      suppressed.push({ ...finding, relPath: rel });
      continue;
    }
    blocking.push(finding);
  }

  if (blocking.length === 0) {
    console.log(
      `[audit-routes-strict] Passed — ${ownershipFindings.length} ownership finding(s), ${suppressed.length} COMMAND_ROUTE exempt via governance registry`
    );
    process.exit(0);
  }

  console.error(
    `[audit-routes-strict] FAILED — ${blocking.length} ownership error(s) not covered by exemptions:\n`
  );
  for (const finding of blocking) {
    const rel = relRoutePath(finding.file) || finding.file;
    console.error(`  [${finding.code}] ${rel}`);
    console.error(`    ${finding.message}`);
    if (finding.suggestion) {
      console.error(`    -> ${finding.suggestion}`);
    }
    console.error("");
  }

  if (suppressed.length > 0) {
    console.error(
      `(${suppressed.length} COMMAND_ROUTE finding(s) suppressed via audit-routes-exemptions.json commandRouteExempt/infrastructure)`
    );
  }

  process.exit(1);
}

main();
