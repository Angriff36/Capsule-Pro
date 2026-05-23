#!/usr/bin/env node
/**
 * check-pm-alignment.mjs
 *
 * Same as before, but skips known generated/internal package.json files
 * (e.g., React Email's .react-email) so drift warnings stay meaningful.
 *
 * References:
 * - Vercel package managers: https://vercel.com/docs/package-managers
 * - Node Corepack: https://nodejs.org/api/corepack.html
 * - pnpm workspaces: https://pnpm.io/workspaces
 * - Vercel ignore: https://vercel.com/docs/deployments/vercel-ignore
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const MUST_MATCH_DEPS = [
  "typescript",
  "react",
  "react-dom",
  "next",
  "eslint",
  "@biomejs/biome",
  "prisma",
];

// Ignore generated/internal package.json files that shouldn't drive repo policy.
const IGNORE_PACKAGE_JSON_PATHS = [
  `${path.sep}.react-email${path.sep}package.json`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.vercel${path.sep}`,
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function shouldIgnorePackageJson(p) {
  const norm = path.normalize(p);
  return IGNORE_PACKAGE_JSON_PATHS.some((frag) => norm.includes(frag));
}

function walkForPackageJson(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const ignoredDirs = new Set([
    "node_modules",
    ".git",
    ".vercel",
    "dist",
    "build",
    "out",
    ".next",
    ".turbo",
    ".cache",
  ]);

  for (const e of entries) {
    if (ignoredDirs.has(e.name)) continue;
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      walkForPackageJson(full, results);
    } else if (e.isFile() && e.name === "package.json") {
      if (!shouldIgnorePackageJson(full)) results.push(full);
    }
  }
  return results;
}

function collectLockfiles(root) {
  const candidates = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb"];
  return candidates.filter((f) => exists(path.join(root, f)));
}

function parsePackageManagerField(pkgJson) {
  const pm = pkgJson.packageManager;
  if (!pm || typeof pm !== "string") return null;
  const at = pm.lastIndexOf("@");
  if (at <= 0) return { name: pm.trim(), version: null };
  return { name: pm.slice(0, at).trim(), version: pm.slice(at + 1).trim() };
}

function mergeDeps(pkgJson) {
  return {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {}),
    ...(pkgJson.optionalDependencies ?? {}),
    ...(pkgJson.peerDependencies ?? {}),
  };
}

function report(title) {
  console.log(`\n== ${title} ==`);
}

let hadError = false;

function error(msg) {
  hadError = true;
  console.error(`ERROR: ${msg}`);
}

function warn(msg) {
  console.warn(`WARN: ${msg}`);
}

function info(msg) {
  console.log(`INFO: ${msg}`);
}

// Root package.json
const rootPkgPath = path.join(repoRoot, "package.json");
if (!exists(rootPkgPath)) {
  error(`No root package.json found at ${rootPkgPath}`);
  process.exit(2);
}
const rootPkg = readJson(rootPkgPath);

report("Root package manager signals");
const lockfiles = collectLockfiles(repoRoot);
info(`Lockfiles in repo root: ${lockfiles.length ? lockfiles.join(", ") : "(none)"}`);

const pmField = parsePackageManagerField(rootPkg);
if (!pmField) {
  warn(`Root package.json has no "packageManager" field.`);
} else {
  info(`Root packageManager: ${pmField.name}${pmField.version ? "@" + pmField.version : ""}`);
  if (exists(path.join(repoRoot, "pnpm-lock.yaml")) && pmField.name !== "pnpm") {
    error(`pnpm-lock.yaml exists but root packageManager is "${pmField.name}".`);
  }
}

report("pnpm settings (optional)");
const npmrcPath = path.join(repoRoot, ".npmrc");
if (exists(npmrcPath)) {
  const npmrc = fs.readFileSync(npmrcPath, "utf8");
  const hasManage = npmrc
    .split("\n")
    .some((l) => l.trim().startsWith("manage-package-manager-versions="));
  info(
    hasManage
      ? `Found "manage-package-manager-versions=" in .npmrc (pnpm setting).`
      : `.npmrc present (pnpm reads it), but no manage-package-manager-versions flag found.`
  );
} else {
  info("No .npmrc in repo root.");
}

report("Workspace package.json scan");
const pkgFiles = walkForPackageJson(repoRoot);
info(`Found ${pkgFiles.length} package.json files under repo root (after ignore filters).`);

const packageManagersFound = new Map();
const depVersions = new Map();

for (const p of pkgFiles) {
  const pkg = readJson(p);

  if (pkg.packageManager) {
    const key = String(pkg.packageManager);
    const arr = packageManagersFound.get(key) ?? [];
    arr.push(p);
    packageManagersFound.set(key, arr);
  }

  const deps = mergeDeps(pkg);
  for (const depName of MUST_MATCH_DEPS) {
    if (!(depName in deps)) continue;
    const spec = deps[depName];
    const versions = depVersions.get(depName) ?? new Map();
    const arr = versions.get(spec) ?? [];
    arr.push(p);
    versions.set(spec, arr);
    depVersions.set(depName, versions);
  }
}

report('package.json "packageManager" field consistency');
if (packageManagersFound.size === 0) {
  info("No packageManager fields found in scanned workspace package.json files.");
} else if (packageManagersFound.size === 1) {
  const only = [...packageManagersFound.keys()][0];
  info(`All packageManager fields match: ${only}`);
} else {
  warn(`Multiple distinct packageManager values found across workspace packages:`);
  for (const [k, paths] of packageManagersFound.entries()) {
    console.log(`- ${k} (${paths.length} files)`);
    for (const ex of paths.slice(0, 5)) console.log(`  - ${path.relative(repoRoot, ex)}`);
    if (paths.length > 5) console.log(`  ... +${paths.length - 5} more`);
  }
}

report("Version drift for must-match dependencies");
for (const depName of MUST_MATCH_DEPS) {
  const versions = depVersions.get(depName);
  if (!versions) continue;

  const specs = [...versions.keys()];
  if (specs.length <= 1) {
    info(`${depName}: consistent (${specs[0]})`);
    continue;
  }

  warn(`${depName}: ${specs.length} different version specs found: ${specs.join(", ")}`);
  for (const spec of specs) {
    const paths = versions.get(spec) ?? [];
    console.log(`  - ${spec} (${paths.length} packages)`);
    for (const ex of paths.slice(0, 5)) console.log(`    - ${path.relative(repoRoot, ex)}`);
    if (paths.length > 5) console.log(`    ... +${paths.length - 5} more`);
  }
}

report("Hard misalignment checks");
const hasPnpmLock = exists(path.join(repoRoot, "pnpm-lock.yaml"));
const hasPackageLock = exists(path.join(repoRoot, "package-lock.json"));
const hasYarnLock = exists(path.join(repoRoot, "yarn.lock"));
const lockCount = [hasPnpmLock, hasPackageLock, hasYarnLock].filter(Boolean).length;
if (lockCount > 1) warn(`Multiple lockfiles exist at repo root.`);

console.log(`\nResult: ${hadError ? "FAIL" : "OK"}`);
process.exit(hadError ? 1 : 0);
