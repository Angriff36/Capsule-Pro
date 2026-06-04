#!/usr/bin/env -S node --import tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { RoutesProjection } from "@angriff36/manifest/projections/routes";
import { ENTITY_DOMAIN_MAP } from "./entity-domain-map.mjs";

const repoRoot = resolve(process.cwd());
const irPath = join(
  repoRoot,
  "manifest/ir/kitchen.ir.json"
);
const outDir = join(repoRoot, "manifest/runtime");
const manifestOut = join(outDir, "routes.manifest.json");
const routesTsOut = join(outDir, "routes.ts");

const args = process.argv.slice(2);
const formatIndex = args.indexOf("--format");
const format =
  formatIndex >= 0 && args[formatIndex + 1] ? args[formatIndex + 1] : "json";

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/**
 * Command POST routes use the singular manifest dispatcher.
 * Read routes keep domain-scoped paths.
 */
function applyRoutePaths(manifest: any): any {
  const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
  const patched = routes.map((route: any) => {
    if (!route.source || route.source.kind !== "command") return route;
    const { entity, command } = route.source;
    const commandSegment = toKebabCase(command);
    return {
      ...route,
      path: `/api/manifest/${entity}/commands/${commandSegment}`,
    };
  });
  return { ...manifest, routes: patched };
}

/**
 * Patch command URL helpers in routes.ts to point at the manifest dispatcher.
 */
function applyManifestDispatcherPathsTs(tsCode: string): string {
  let result = tsCode;
  const returnRegex = /"\/api\/([a-z0-9-]+)\/([a-z0-9-]+)"/g;
  result = result.replace(returnRegex, (_match, entityKebab: string, command: string) => {
    const entity =
      Object.keys(ENTITY_DOMAIN_MAP).find(
        (name) => toKebabCase(name) === entityKebab
      ) ?? entityKebab;
    return `"/api/manifest/${entity}/commands/${command}"`;
  });

  const jsdocRegex = /POST \/api\/([a-z0-9-]+)\/([a-z0-9-]+)/g;
  result = result.replace(jsdocRegex, (_match, entityKebab: string, command: string) => {
    const entity =
      Object.keys(ENTITY_DOMAIN_MAP).find(
        (name) => toKebabCase(name) === entityKebab
      ) ?? entityKebab;
    return `POST /api/manifest/${entity}/commands/${command}`;
  });

  return result;
}

function printSummary(manifest: { routes?: unknown[] }) {
  const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
  const reads = routes.filter((r: any) => r.method === "GET").length;
  const writes = routes.filter((r: any) => r.method === "POST").length;
  const manuals = routes.filter((r: any) => r.source?.kind === "manual").length;

  console.log("Route Surface Summary");
  console.log(`  Total routes: ${routes.length}`);
  console.log(`  Read (GET): ${reads}`);
  console.log(`  Write (POST): ${writes}`);
  console.log(`  Manual: ${manuals}`);
}

function main() {
  if (!existsSync(irPath)) {
    console.error(`[route-manifest] Missing compiled IR: ${irPath}`);
    process.exit(1);
  }

  const ir = JSON.parse(readFileSync(irPath, "utf-8"));
  const projection = new RoutesProjection();

  const manifestResult = projection.generate(ir, {
    surface: "routes.manifest",
    options: { basePath: "/api" },
  });
  const routesTsResult = projection.generate(ir, {
    surface: "routes.ts",
    options: { basePath: "/api" },
  });

  const diagnostics = [
    ...manifestResult.diagnostics,
    ...routesTsResult.diagnostics,
  ];
  const errors = diagnostics.filter((d: any) => d.severity === "error");
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(
        `[route-manifest] ${(error as any).code}: ${(error as any).message}`
      );
    }
    process.exit(1);
  }

  // Apply domain path overrides so routes.manifest.json reflects actual Next.js paths
  const rawManifest = JSON.parse(manifestResult.artifacts[0].code);
  const patchedManifest = applyRoutePaths(rawManifest);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(manifestOut, JSON.stringify(patchedManifest, null, 2));
  // routes.ts path helpers are derived from the same IR — patch them too
  // by regenerating from the patched manifest paths
  const patchedTsCode = applyManifestDispatcherPathsTs(routesTsResult.artifacts[0].code);
  writeFileSync(routesTsOut, patchedTsCode);

  if (format === "summary") {
    printSummary(patchedManifest);
  } else {
    console.log(JSON.stringify(patchedManifest, null, 2));
  }
}

main();
