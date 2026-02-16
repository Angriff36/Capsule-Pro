#!/usr/bin/env node

/**
 * Route Manifest Generator
 *
 * Scans the API route tree (apps/api/app/api/) and the compiled Manifest IR
 * to produce two artifacts:
 *
 *   1. packages/manifest-ir/dist/routes.manifest.json
 *      — Canonical list of every HTTP route with method + param metadata.
 *
 *   2. packages/manifest-ir/dist/routes.ts
 *      — Typed helper functions that build URL paths at runtime.
 *
 * Run:  node scripts/manifest/generate-route-manifest.mjs
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(process.cwd());
const API_ROUTE_ROOT = join(REPO_ROOT, "apps/api/app/api");
const IR_PATH = join(
  REPO_ROOT,
  "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
);
const OUTPUT_DIR = join(REPO_ROOT, "packages/manifest-ir/dist");
const MANIFEST_JSON = join(OUTPUT_DIR, "routes.manifest.json");
const ROUTES_TS = join(OUTPUT_DIR, "routes.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively walk a directory tree and return all route.ts locations. */
function walkRoutes(dir) {
  const results = [];
  if (!existsSync(dir)) {
    return results;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkRoutes(full));
    } else if (entry.name === "route.ts") {
      results.push(dir);
    }
  }
  return results;
}

/** Read the first ~40 lines of a route handler to infer HTTP methods. */
function inferMethods(routeDir) {
  const routeFile = join(routeDir, "route.ts");
  if (!existsSync(routeFile)) {
    return ["GET"];
  }
  const head = readFileSync(routeFile, "utf-8").slice(0, 3000);
  const methods = [];
  if (/export\s+(async\s+)?function\s+GET/m.test(head)) {
    methods.push("GET");
  }
  if (/export\s+(async\s+)?function\s+POST/m.test(head)) {
    methods.push("POST");
  }
  if (/export\s+(async\s+)?function\s+PUT/m.test(head)) {
    methods.push("PUT");
  }
  if (/export\s+(async\s+)?function\s+PATCH/m.test(head)) {
    methods.push("PATCH");
  }
  if (/export\s+(async\s+)?function\s+DELETE/m.test(head)) {
    methods.push("DELETE");
  }
  return methods.length > 0 ? methods : ["GET"];
}

/** Convert a filesystem path segment like `[recipeId]` to `:recipeId`. */
function extractParams(routePath) {
  const params = [];
  const paramRegex = /\[([^\]]+)\]/g;
  let match;
  while ((match = paramRegex.exec(routePath)) !== null) {
    params.push(match[1]);
  }
  return params;
}

/** Normalise a filesystem-relative path to a URL path. */
function toUrlPath(relPath) {
  return "/api/" + relPath.replace(/\\/g, "/").replace(/\[([^\]]+)\]/g, ":$1");
}

/** Convert a URL path to a camelCase helper name. */
function toHelperName(urlPath) {
  // /api/kitchen/recipes/:recipeId/versions -> kitchenRecipesVersions
  const segments = urlPath
    .replace(/^\/api\//, "")
    .split("/")
    .filter((s) => !s.startsWith(":"));

  return segments
    .map((seg, i) => {
      // kebab-case to camelCase
      const camel = seg.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return i === 0 ? camel : camel.charAt(0).toUpperCase() + camel.slice(1);
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("[route-manifest] Scanning API routes...");

  const routeDirs = walkRoutes(API_ROUTE_ROOT);
  console.log(`[route-manifest] Found ${routeDirs.length} route handlers`);

  // Build route entries
  const routes = routeDirs
    .map((dir) => {
      const relPath = relative(API_ROUTE_ROOT, dir);
      const urlPath = toUrlPath(relPath);
      const methods = inferMethods(dir);
      const params = extractParams(relPath);
      const helperName = toHelperName(urlPath);

      return {
        path: urlPath,
        methods,
        params,
        helperName,
        source: "filesystem",
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  // Enrich with Manifest IR metadata
  if (existsSync(IR_PATH)) {
    try {
      const ir = JSON.parse(readFileSync(IR_PATH, "utf-8"));
      const commandNames = new Set(
        (ir.commands || []).map((c) => `${c.entity || "unknown"}.${c.name}`)
      );
      for (const route of routes) {
        // Mark manifest-generated command routes
        if (route.path.includes("/commands/")) {
          route.source = "manifest-command";
        }
        // Mark manifest list projections
        if (route.path.match(/\/[a-z]+\/list$/)) {
          route.source = "manifest-projection";
        }
      }
      console.log(
        `[route-manifest] IR loaded: ${ir.entities?.length ?? 0} entities, ${ir.commands?.length ?? 0} commands`
      );
    } catch (err) {
      console.warn(
        `[route-manifest] Warning: Could not load IR from ${IR_PATH}: ${err.message}`
      );
    }
  }

  // -----------------------------------------------------------------------
  // Write routes.manifest.json
  // -----------------------------------------------------------------------
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    routeCount: routes.length,
    routes,
  };

  writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2));
  console.log(`[route-manifest] Wrote ${MANIFEST_JSON}`);

  // -----------------------------------------------------------------------
  // Write routes.ts  (typed helpers)
  // -----------------------------------------------------------------------
  const lines = [
    "/**",
    " * Generated Route Helpers — DO NOT EDIT",
    " *",
    " * Re-run:  node scripts/manifest/generate-route-manifest.mjs",
    ` * Generated at: ${new Date().toISOString()}`,
    ` * Total routes: ${routes.length}`,
    " */",
    "",
    "// eslint-disable-next-line -- generated file, string literals are canonical definitions",
    "",
    "// ---------------------------------------------------------------------------",
    "// Route path builders",
    "// ---------------------------------------------------------------------------",
    "",
  ];

  // Deduplicate helper names (some routes may collide after stripping params)
  const seen = new Map();
  for (const route of routes) {
    let name = route.helperName;
    if (seen.has(name)) {
      // Append a disambiguator from the first param
      const suffix =
        route.params.length > 0
          ? route.params[0].charAt(0).toUpperCase() + route.params[0].slice(1)
          : `_${seen.get(name) + 1}`;
      name = `${name}By${suffix}`;
    }
    seen.set(route.helperName, (seen.get(route.helperName) || 0) + 1);
    route._tsName = name;
  }

  // Reset and do a second pass with stable names
  const finalNames = new Map();
  for (const route of routes) {
    let name = route.helperName;
    const count = finalNames.get(name) || 0;
    if (count > 0) {
      if (route.params.length > 0) {
        const suffix =
          route.params[0].charAt(0).toUpperCase() + route.params[0].slice(1);
        name = `${name}By${suffix}`;
      } else {
        name = `${name}_${count}`;
      }
    }
    finalNames.set(route.helperName, count + 1);
    route._tsName = name;
  }

  for (const route of routes) {
    const paramList = route.params;
    const originalPath = route.path;

    if (paramList.length === 0) {
      // No params — simple constant
      lines.push(`/** ${route.methods.join(", ")} ${originalPath} */`);
      lines.push(
        `export const ${route._tsName} = (): string => "${originalPath.replace(/:[^/]+/g, "")}";`
      );
    } else {
      // Has params — function with typed args
      const argType = paramList.map((p) => `${p}: string`).join(", ");
      let body = `"${originalPath}"`;
      for (const p of paramList) {
        body = `${body}.replace(":${p}", encodeURIComponent(${p}))`;
      }
      lines.push(`/** ${route.methods.join(", ")} ${originalPath} */`);
      lines.push(
        `export const ${route._tsName} = (${argType}): string => ${body};`
      );
    }
    lines.push("");
  }

  // Export a flat lookup for dev-time validation
  lines.push(
    "// ---------------------------------------------------------------------------"
  );
  lines.push("// Route pattern list (for dev-time validation)");
  lines.push(
    "// ---------------------------------------------------------------------------"
  );
  lines.push("");
  lines.push("/** All known route patterns. Used by apiFetch dev guard. */");
  lines.push("export const ROUTE_PATTERNS: readonly string[] = [");
  for (const route of routes) {
    lines.push(`  "${route.path}",`);
  }
  lines.push("] as const;");
  lines.push("");

  writeFileSync(ROUTES_TS, lines.join("\n"));
  console.log(`[route-manifest] Wrote ${ROUTES_TS}`);
  console.log("[route-manifest] Done.");
}

main();
