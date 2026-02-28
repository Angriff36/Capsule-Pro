#!/usr/bin/env node

/**
 * Blocks staged write route handlers that are outside canonical Manifest route surface.
 *
 * Scope:
 * - Staged added/modified Next.js handlers under apps/api/app/api ending with route.ts/tsx/js/jsx
 * - Methods: POST, PUT, PATCH, DELETE
 *
 * Passes when each staged write method maps to:
 *  1) A method+path entry in packages/manifest-ir/dist/routes.manifest.json, or
 *  2) An infrastructure allowlist rule (webhooks/auth/cron/health).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ROUTE_FILE_RE = /^apps\/api\/app\/api\/.+\/route\.(ts|tsx|js|jsx)$/;
const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const ROUTE_MANIFEST_PATH = "packages/manifest-ir/dist/routes.manifest.json";
const INFRA_ALLOWLIST_PATH =
  "scripts/manifest/write-route-infra-allowlist.json";

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `git ${args.join(" ")} failed`
    );
  }
  return result.stdout;
}

function getStagedRouteFiles() {
  const output = runGit([
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=AM",
  ]);
  return output
    .split(/\r?\n/)
    .map((value) => value.trim().replace(/\\/g, "/"))
    .filter((value) => value.length > 0 && ROUTE_FILE_RE.test(value))
    .sort((a, b) => a.localeCompare(b));
}

function readStagedFile(path) {
  const blobPath = `:${path}`;
  const result = spawnSync("git", ["show", blobPath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Unable to read staged file ${path}`);
  }
  return result.stdout;
}

function detectWriteMethods(source) {
  const methods = new Set();
  const patterns = [
    /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/g,
    /export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/g,
    /export\s*{([^}]+)}/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(source);
    while (match) {
      if (pattern.source.startsWith("export\\s*{")) {
        const exportsBody = match[1] ?? "";
        for (const method of WRITE_METHODS) {
          const methodRe = new RegExp(`\\b${method}\\b`);
          if (methodRe.test(exportsBody)) {
            methods.add(method);
          }
        }
      } else if (match[1]) {
        methods.add(match[1]);
      }
      match = pattern.exec(source);
    }
  }

  return [...methods].sort((a, b) => a.localeCompare(b));
}

function routePathFromFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const relative = normalized
    .replace(/^apps\/api\/app\/api\//, "")
    .replace(/\/route\.(ts|tsx|js|jsx)$/, "");

  if (relative.length === 0) {
    return "/api";
  }

  const segments = relative
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      const catchAll = segment.match(/^\[\[?\.{3}([^\]]+)\]?\]$/);
      if (catchAll) {
        return `:${catchAll[1]}`;
      }
      const param = segment.match(/^\[([^\]]+)\]$/);
      if (param) {
        return `:${param[1]}`;
      }
      return segment;
    });

  return `/api/${segments.join("/")}`;
}

function loadCanonicalRoutes() {
  if (!existsSync(ROUTE_MANIFEST_PATH)) {
    throw new Error(
      `Missing ${ROUTE_MANIFEST_PATH}. Run pnpm manifest:routes:ir.`
    );
  }
  const manifest = JSON.parse(readFileSync(ROUTE_MANIFEST_PATH, "utf8"));
  const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
  const keys = new Set();
  for (const route of routes) {
    if (typeof route.path !== "string" || typeof route.method !== "string") {
      continue;
    }
    keys.add(`${route.method.toUpperCase()} ${route.path}`);
  }
  return keys;
}

function loadInfraAllowlist() {
  if (!existsSync(INFRA_ALLOWLIST_PATH)) {
    throw new Error(`Missing ${INFRA_ALLOWLIST_PATH}`);
  }
  const parsed = JSON.parse(readFileSync(INFRA_ALLOWLIST_PATH, "utf8"));
  return Array.isArray(parsed.rules) ? parsed.rules : [];
}

function isInfraAllowlisted(path, method, rules) {
  return rules.some((rule) => {
    if (!rule) {
      return false;
    }

    // Check prefix-based rule
    if (typeof rule.prefix === "string") {
      if (!path.startsWith(rule.prefix)) {
        return false;
      }
    }
    // Check pattern-based rule (regex)
    else if (typeof rule.pattern === "string") {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(path)) {
        return false;
      }
    }
    // No valid match criteria
    else {
      return false;
    }

    const methods = Array.isArray(rule.methods) ? rule.methods : [];
    return methods.includes(method) || methods.includes("*");
  });
}

function main() {
  const stagedFiles = getStagedRouteFiles();
  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  const canonicalRoutes = loadCanonicalRoutes();
  const infraRules = loadInfraAllowlist();

  const violations = [];

  for (const filePath of stagedFiles) {
    const source = readStagedFile(filePath);
    const methods = detectWriteMethods(source);
    if (methods.length === 0) {
      continue;
    }

    const routePath = routePathFromFile(filePath);
    for (const method of methods) {
      const key = `${method} ${routePath}`;
      if (canonicalRoutes.has(key)) {
        continue;
      }
      if (isInfraAllowlisted(routePath, method, infraRules)) {
        continue;
      }
      violations.push({ filePath, routePath, method });
    }
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  console.error(
    "[check-staged-write-routes] Blocked non-manifest write route changes:"
  );
  for (const violation of violations) {
    console.error(
      `  - ${violation.filePath} -> ${violation.method} ${violation.routePath}`
    );
  }
  console.error(
    `[check-staged-write-routes] Add/modify Manifest commands and regenerate ${ROUTE_MANIFEST_PATH}, or extend ${INFRA_ALLOWLIST_PATH} for infrastructure routes.`
  );
  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(
    `[check-staged-write-routes] Failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}
