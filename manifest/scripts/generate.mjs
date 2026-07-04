#!/usr/bin/env node

/**
 * Native config-driven Next.js route generation.
 *
 * Manifest 3.0.0's nextjs projection places routes under domain paths natively
 * via `projections.nextjs.options.routeSegments` and resolves Prisma accessors
 * via `accessorNames` — so this script no longer stages CLI output to a temp dir
 * and remaps/rewrites it. It calls the projection directly for the read surfaces
 * (list + detail) using the config option bag as the single source of truth, then
 * writes the capsule-owned command dispatcher template.
 *
 * The projection emits `nextjs.route` (GET list) and `nextjs.detail` (GET by id)
 * as SEPARATE surfaces; the CLI `generate` command only walks `nextjs.route`, so
 * detail is generated here via the public projection API (3.0.0 gap).
 *
 * Config: manifest.config.yaml → projections.nextjs.options.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { NextJsProjection } from "@angriff36/manifest/projections/nextjs";
import { getConfigPaths, readConfig } from "./read-config.mjs";

const {
  repoRoot,
  irPath,
  dispatcherDir,
  dispatcherExecutorImportPath,
  dispatcherExecutorImportName,
  readRoutesEnabled,
} = getConfigPaths();

// Full nextjs projection option bag, straight from config (single source of truth
// for routeSegments/accessorNames/tenant+soft-delete filters/import paths).
const options = readConfig().projections?.nextjs?.options ?? {};
const routeSegments = options.routeSegments ?? {};

// Entities whose GET-by-id detail route is NOT emitted:
//  - TaskBundleItem: composite PK, no single-column id to address by.
//  - AdminChatThread / EventImport: a hand-written detail handler owns the dynamic
//    segment ([threadId] / [importId]). Native detail hardcodes [id], so emitting
//    here would add a stray second detail file instead of colliding-and-skipping
//    against the hand-written one. Exclude to match the committed tree.
const DETAIL_EXCLUDE = new Set([
  "TaskBundleItem",
  "AdminChatThread",
  "EventImport",
]);

const GENERATED_MARKERS = [
  "Generated from Manifest IR",
  "@generated",
  "DO NOT EDIT - Changes will be overwritten",
  "Auto-generated Next.js API",
];
const hasGeneratedMarker = (contents) =>
  GENERATED_MARKERS.some((marker) => contents.includes(marker));

const REQUEST_IDENT_RE = /\brequest\b/;

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const projection = new NextJsProjection();

let written = 0;
let skippedNonGenerated = 0;
const emptySurfaces = [];

/** Write one artifact, never clobbering a hand-written (non-generated) route. */
const writeArtifact = (artifact) => {
  if (!artifact.pathHint) {
    return;
  }
  // pathHint is `${appDir}/${routeSegment}/(list|[id])/route.ts` — a repo-root
  // relative path (appDir carries the full apps/api/app/api prefix in config).
  const destination = resolve(repoRoot, artifact.pathHint);
  if (
    existsSync(destination) &&
    !hasGeneratedMarker(readFileSync(destination, "utf8"))
  ) {
    skippedNonGenerated += 1;
    return;
  }
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, lintCleanRoute(artifact.code), "utf8");
  written += 1;
};

/**
 * Keep generated routes lint/typecheck-clean under noUnusedParameters: the
 * stock template names the handler param `request` even when the body never
 * reads it. Prefix it `_request` ONLY when unused (list routes with
 * pagination DO read it).
 */
const lintCleanRoute = (code) => {
  const declaration = "(request: NextRequest";
  if (!code.includes(declaration)) {
    return code;
  }
  const body = code.replace(declaration, "(");
  const usesRequest = REQUEST_IDENT_RE.test(body);
  return usesRequest
    ? code
    : code.replace(declaration, "(_request: NextRequest");
};

/** Generate a single read surface for an entity and write its artifacts. */
const emit = (surface, entityName) => {
  const result = projection.generate(ir, {
    surface,
    entity: entityName,
    options,
  });
  for (const diagnostic of result.diagnostics) {
    if (diagnostic.severity === "error") {
      console.warn(
        `[manifest/generate] ${surface} ${entityName}: ${diagnostic.message}`
      );
    }
  }
  if (result.artifacts.length === 0) {
    emptySurfaces.push(`${surface}:${entityName}`);
    return;
  }
  for (const artifact of result.artifacts) {
    writeArtifact(artifact);
  }
};

if (readRoutesEnabled) {
  for (const entity of ir.entities) {
    // Only entities mapped to a route segment get routes (unmapped IR entities —
    // mixins/abstract bases — are intentionally excluded, matching prior behavior).
    if (!routeSegments[entity.name]) {
      continue;
    }
    emit("nextjs.route", entity.name); // GET list
    if (!DETAIL_EXCLUDE.has(entity.name)) {
      emit("nextjs.detail", entity.name); // GET by id
    }
  }
} else {
  console.log(
    "[manifest/generate] readRoutes.enabled=false — skipping read-route generation."
  );
}

// Singular dynamic command dispatcher. Capsule owns this template (custom
// auth/tenant resolution + runManifestCommand), so native dispatcher emission is
// disabled (dispatcher.enabled=false); we write it here. All domain command POSTs
// route through this single file.
{
  mkdirSync(dispatcherDir, { recursive: true });
  const dispatcherPath = resolve(dispatcherDir, "route.ts");
  const dispatcherCode = [
    "// @generated — Generated from Manifest IR. DO NOT EDIT.",
    "// Singular dynamic command dispatcher.",
    "// All domain command POSTs route through here → guards, policies, constraints, actions, events.",
    "",
    `import type { NextRequest } from "next/server";`,
    `import { captureException } from "@sentry/nextjs";`,
    `import { requireCurrentUser } from "@/app/lib/tenant";`,
    `import { manifestErrorResponse } from "@/lib/manifest-response";`,
    `import { ${dispatcherExecutorImportName} } from "${dispatcherExecutorImportPath}";`,
    "",
    `export const runtime = "nodejs";`,
    "",
    "export async function POST(",
    "  request: NextRequest,",
    "  context?: { params?: Promise<{ entity: string; command: string }> }",
    "): Promise<Response> {",
    "  try {",
    "    if (!context?.params) {",
    '      return manifestErrorResponse("Missing route params", 400);',
    "    }",
    "    const { entity, command: commandSlug } = await context.params;",
    "    const currentUser = await requireCurrentUser();",
    "    const body = await request.json().catch(() => ({}));",
    "",
    `    return await ${dispatcherExecutorImportName}({`,
    "      entity,",
    "      command: commandSlug,",
    "      body,",
    "      user: {",
    "        id: currentUser.id,",
    "        tenantId: currentUser.tenantId,",
    "        role: currentUser.role,",
    "      },",
    "    });",
    "  } catch (error) {",
    "    // Auth/tenant resolution errors from requireCurrentUser should return 401, not 500.",
    "    // InvariantError is thrown for: Unauthenticated, Tenant not found, User not found.",
    '    if (error instanceof Error && error.name === "InvariantError") {',
    "      return manifestErrorResponse(error.message, 401);",
    "    }",
    "    captureException(error);",
    '    return manifestErrorResponse("Internal server error", 500);',
    "  }",
    "}",
    "",
  ].join("\n");
  writeFileSync(dispatcherPath, dispatcherCode, "utf8");
  console.log(`[manifest/generate] Wrote dispatcher → ${dispatcherPath}`);
}

console.log(
  `[manifest/generate] Wrote ${written} route file(s); skipped ${skippedNonGenerated} hand-written destination(s).`
);
if (emptySurfaces.length > 0) {
  console.log(
    `[manifest/generate] ${emptySurfaces.length} surface(s) produced no artifact: ${emptySurfaces.join(", ")}`
  );
}
