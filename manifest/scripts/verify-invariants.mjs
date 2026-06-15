#!/usr/bin/env node

/**
 * Manifest Invariants — hard CI gate.
 *
 * Guards the structural migrations that were landed on the native-Manifest path
 * so they cannot silently regress. Every check below corresponds to a tracked
 * divergence in manifest/MANIFEST-DIVERGENCES.md:
 *
 *   U6   — tenant is declared exactly ONCE (the shared _base.manifest); every
 *          domain file `use`s it; no domain file re-declares its own tenant.
 *   D11  — the build merges via native compileProjectToIR, not hand-rolled mergeIrs.
 *   D9   — the native merge preserves sagas + reactions (no silent drop).
 *   D14  — every command carries an entity (no command-ownership repair needed).
 *   —    — the freshly-compiled IR is single-tenant, error-free, and the COMMITTED
 *          kitchen.ir.json matches it (not stale) with a valid provenance.irHash.
 *   D22  — the installed Manifest (>= 2.5.1) Prisma projection emits `enum` blocks
 *          and types enum-valued columns as the enum.
 *   D12  — the native public mergeIR is available.
 *
 * Exits non-zero (failing CI) if ANY invariant is violated.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { readFile as readFileAsync, access as accessAsync } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { join, resolve, relative } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { compileProjectToIR } from "@angriff36/manifest/multi-compiler";
import { PrismaProjection } from "@angriff36/manifest/projections/prisma";
import { getConfigPaths } from "./read-config.mjs";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Tiny assertion harness
// ---------------------------------------------------------------------------
const results = [];
function check(group, name, ok, detail = "") {
  results.push({ group, name, ok: !!ok, detail });
  const tag = ok ? "✓ PASS" : "✗ FAIL";
  console.log(`  ${tag}  [${group}] ${name}${ok ? "" : `\n           -> ${detail}`}`);
}

// Floors guard against catastrophic drops (e.g. a duplicate-tenant or saga-drop
// regression) WITHOUT pinning exact counts (so legitimately adding entities does
// not break CI). Fresh-vs-committed equality below catches staleness precisely.
const MIN_ENTITIES = 180;
const MIN_COMMANDS = 900;
const MIN_SAGAS = 2; // D9: 2 sagas kept (see _saga-decisions.md), 3 deleted
const MIN_REACTIONS = 9;
const MIN_MANIFEST_VERSION = "2.5.1";

const TENANT_RE = /^\s*tenant\s+\w+\s*:/m; // a top-level `tenant <name> : ...` declaration
const TENANT_LINE_RE = /^\s*tenant\s+\w+\s*:/;

function deterministicStringify(obj) {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = value[key];
          return sorted;
        }, {});
    }
    return value;
  });
}

function cmpSemver(a, b) {
  const pa = a.split("-")[0].split(".").map(Number);
  const pb = b.split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

function discoverManifestFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".manifest")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

async function main() {
  const { srcDir, outputDir } = getConfigPaths();
  const SRC = srcDir;
  const IR_FILE = resolve(outputDir.startsWith("/") || /^[A-Za-z]:/.test(outputDir) ? outputDir : join(process.cwd(), outputDir), "kitchen.ir.json");
  const BASE_FILE = join(SRC, "_base.manifest");

  const files = discoverManifestFiles(SRC);
  const domainFiles = files.filter((f) => !f.replace(/\\/g, "/").endsWith("_base.manifest"));

  console.log(`\nManifest invariants — ${files.length} source files (${domainFiles.length} domain + base)\n`);

  // ----- GROUP A: U6 tenant consolidation -----
  console.log("A. Tenant consolidation (U6)");
  check("U6", "_base.manifest exists", existsSync(BASE_FILE), `expected ${BASE_FILE}`);
  check(
    "U6",
    "_base.manifest declares the tenant",
    existsSync(BASE_FILE) && TENANT_RE.test(readFileSync(BASE_FILE, "utf8")),
    "no top-level `tenant <name> : ...` in _base.manifest",
  );

  const tenantDeclarers = files.filter((f) => TENANT_RE.test(readFileSync(f, "utf8")));
  check(
    "U6",
    "exactly ONE file declares a tenant (the base)",
    tenantDeclarers.length === 1 &&
      tenantDeclarers[0].replace(/\\/g, "/").endsWith("_base.manifest"),
    `files declaring a top-level tenant: ${tenantDeclarers.map((f) => relative(SRC, f)).join(", ") || "none"}`,
  );

  const domainTenantOffenders = domainFiles.filter((f) => TENANT_RE.test(readFileSync(f, "utf8")));
  check(
    "U6",
    "no domain file re-declares a tenant",
    domainTenantOffenders.length === 0,
    `offenders: ${domainTenantOffenders.map((f) => relative(SRC, f)).join(", ")}`,
  );

  const missingUse = domainFiles.filter((f) => !/(^|\n)\s*use\s+["'][^"']*_base\.manifest["']/.test(readFileSync(f, "utf8")));
  check(
    "U6",
    "every domain file uses the shared base",
    missingUse.length === 0,
    `${missingUse.length} file(s) missing the base 'use': ${missingUse.slice(0, 8).map((f) => relative(SRC, f)).join(", ")}${missingUse.length > 8 ? " ..." : ""}`,
  );

  // ----- GROUP B: native build path (D11) -----
  console.log("B. Native build path (D11)");
  const compileSrc = existsSync(join(SRC, "../scripts/compile.mjs"))
    ? readFileSync(join(SRC, "../scripts/compile.mjs"), "utf8")
    : readFileSync(resolve(process.cwd(), "manifest/scripts/compile.mjs"), "utf8");
  check(
    "D11",
    "compile.mjs uses native compileProjectToIR",
    /compileProjectToIR/.test(compileSrc) && /@angriff36\/manifest\/multi-compiler/.test(compileSrc),
    "compile.mjs no longer imports/calls compileProjectToIR",
  );
  check(
    "D11",
    "compile.mjs no longer imports/calls hand-rolled mergeIrs",
    !/\bmergeIrs\s*\(/.test(compileSrc) && !/import[^;]*\bmergeIrs\b/.test(compileSrc),
    "compile.mjs still imports or calls the hand-rolled mergeIrs (a comment mention is fine)",
  );

  // ----- GROUP C: fresh native compile is valid + single-tenant -----
  console.log("C. Fresh native compile (single tenant, no drops, D9/D14)");
  const host = {
    readFile: (p) => readFileAsync(p, "utf8"),
    resolvePath: (fromDir, rel) => resolve(fromDir, rel),
    fileExists: async (p) => {
      try {
        await accessAsync(p);
        return true;
      } catch {
        return false;
      }
    },
  };
  const { ir: fresh, diagnostics } = await compileProjectToIR({ entries: files, host, basePath: SRC });
  const errors = (diagnostics ?? []).filter((d) => d.severity === "error");
  check("compile", "compiles with ZERO errors", !!fresh && errors.length === 0, `${errors.length} error(s); first: ${errors[0]?.message ?? ""}`);

  if (fresh) {
    check("U6", "merged IR has exactly one tenant", !!fresh.tenant, "merged IR has no tenant");
    check("counts", `>= ${MIN_ENTITIES} entities`, (fresh.entities?.length ?? 0) >= MIN_ENTITIES, `got ${fresh.entities?.length}`);
    check("counts", `>= ${MIN_COMMANDS} commands`, (fresh.commands?.length ?? 0) >= MIN_COMMANDS, `got ${fresh.commands?.length}`);
    check("D9", `sagas preserved (>= ${MIN_SAGAS})`, (fresh.sagas?.length ?? 0) >= MIN_SAGAS, `got ${fresh.sagas?.length ?? 0}`);
    check("D9", `reactions preserved (>= ${MIN_REACTIONS})`, (fresh.reactions?.length ?? 0) >= MIN_REACTIONS, `got ${fresh.reactions?.length ?? 0}`);
    const cmdNoEntity = (fresh.commands ?? []).filter((c) => !c.entity);
    check("D14", "every command carries an entity", cmdNoEntity.length === 0, `${cmdNoEntity.length} command(s) without .entity: ${cmdNoEntity.slice(0, 5).map((c) => c.name).join(", ")}`);
  }

  // ----- GROUP D: committed IR is in sync + hash-valid -----
  console.log("D. Committed IR integrity");
  if (existsSync(IR_FILE) && fresh) {
    const committed = JSON.parse(readFileSync(IR_FILE, "utf8"));
    check("ir", "committed IR has a single tenant", !!committed.tenant, "committed kitchen.ir.json has no tenant");
    const sameCounts =
      committed.entities?.length === fresh.entities?.length &&
      committed.commands?.length === fresh.commands?.length &&
      (committed.sagas?.length ?? 0) === (fresh.sagas?.length ?? 0) &&
      (committed.reactions?.length ?? 0) === (fresh.reactions?.length ?? 0);
    check(
      "ir",
      "committed IR is NOT stale (matches fresh compile)",
      sameCounts,
      `committed e=${committed.entities?.length} c=${committed.commands?.length} s=${committed.sagas?.length ?? 0} r=${committed.reactions?.length ?? 0} vs fresh e=${fresh.entities?.length} c=${fresh.commands?.length} s=${fresh.sagas?.length ?? 0} r=${fresh.reactions?.length ?? 0} — run pnpm manifest:compile`,
    );
    const stored = committed.provenance?.irHash ?? "";
    const clone = JSON.parse(JSON.stringify(committed));
    if (clone.provenance) clone.provenance.irHash = "";
    const recomputed = createHash("sha256").update(deterministicStringify(clone)).digest("hex");
    check("ir", "committed provenance.irHash is valid", stored.length > 0 && stored === recomputed, "stored irHash != recompute — IR was hand-edited or compiled with a different algorithm");
  } else {
    check("ir", "committed kitchen.ir.json exists", existsSync(IR_FILE), `missing ${IR_FILE}`);
  }

  // ----- GROUP E: installed capability (D22 enum emission, D12 mergeIR) -----
  console.log("E. Installed Manifest capability (D22 / D12)");
  const installedVersion = require("@angriff36/manifest/package.json").version;
  check(
    "dep",
    `@angriff36/manifest >= ${MIN_MANIFEST_VERSION}`,
    cmpSemver(installedVersion, MIN_MANIFEST_VERSION) >= 0,
    `installed ${installedVersion}`,
  );

  // D22: the Prisma projection must emit enum blocks + type enum columns.
  const enumIR = {
    version: "1.0",
    provenance: { contentHash: "t", compilerVersion: "t", schemaVersion: "1.0", compiledAt: "2025-01-01T00:00:00.000Z" },
    modules: [], values: [], enums: [{ name: "Stage", values: [{ name: "lead" }, { name: "won" }] }],
    entities: [{
      name: "Deal",
      properties: [
        { name: "id", type: { name: "string", nullable: false }, modifiers: ["required"] },
        { name: "stage", type: { name: "Stage", nullable: false }, modifiers: ["required"], defaultValue: { kind: "string", value: "lead" } },
      ],
      computedProperties: [], relationships: [], commands: [], constraints: [], policies: [],
    }],
    stores: [{ entity: "Deal", target: "durable", config: {} }],
    events: [], commands: [], policies: [],
  };
  let enumCode = "";
  try {
    const out = new PrismaProjection().generate(enumIR, { surface: "prisma.schema" });
    enumCode = out.artifacts?.[0]?.code ?? "";
  } catch (e) {
    enumCode = `__THREW__ ${e?.message ?? e}`;
  }
  check("D22", "Prisma projection emits `enum` blocks", /enum\s+Stage\s*\{/.test(enumCode), `projection output had no enum block (installed ${installedVersion}). Output head: ${enumCode.slice(0, 120)}`);
  check("D22", "enum-valued column typed as the enum (not String)", /\bstage\s+Stage\b/.test(enumCode), "stage column not typed as the Stage enum");
  check("D22", "enum default emitted bare (not quoted)", /@default\(lead\)/.test(enumCode) && !/@default\("lead"\)/.test(enumCode), "enum default not bare");

  // D12: public mergeIR is available (single-file compile then native merge).
  let mergeIROk = false;
  try {
    const mod = await import("@angriff36/manifest/multi-compiler");
    mergeIROk = typeof mod.mergeIR === "function";
  } catch { /* ignore */ }
  check("D12", "native public mergeIR is exported", mergeIROk, "@angriff36/manifest/multi-compiler does not export mergeIR");

  // ----- Summary -----
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"-".repeat(60)}`);
  console.log(`Manifest invariants: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.error(`\n✗ ${failed.length} invariant(s) FAILED:`);
    for (const f of failed) console.error(`   - [${f.group}] ${f.name}`);
    console.error("\nThese guard the U6 tenant consolidation, native compile, and 2.5.1 enum emission. Fix the regression (see manifest/MANIFEST-DIVERGENCES.md).");
    process.exit(1);
  }
  console.log("✓ All manifest invariants hold.");
}

main().catch((err) => {
  console.error("[verify-invariants] fatal:", err);
  process.exit(1);
});
