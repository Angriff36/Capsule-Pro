#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  ENTITY_DOMAIN_MAP,
  FLAT_SEGMENT_TO_ENTITY,
  resolveAccessor,
  resolveDetailSegment,
  applyFieldOverrides,
  ENTITY_DETAIL_DROP,
} from "./entity-domain-map.mjs";
import { getConfigPaths } from "./read-config.mjs";

const {
  repoRoot,
  irPath: defaultIr,
  nextjsOutput: defaultOutput,
  appDirPrefix,
  readRoutesEnabled,
} = getConfigPaths();

const userArgs = process.argv.slice(2);

// Default: generate kitchen IR with nextjs projection (route surface only).
// List surface routes need different output path handling and are not yet
// fully mapped via ENTITY_DOMAIN_MAP — kept as "route" to avoid malformed output.
const baseArgs =
  userArgs.length > 0
    ? userArgs
    : [
        defaultIr,
        "--projection",
        "nextjs",
        "--surface",
        "route",
        "--output",
        defaultOutput,
      ];

const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

// ENTITY_DOMAIN_MAP is imported from ./entity-domain-map.mjs (canonical single source).
// It maps each Manifest entity to its domain directory under apps/api/app/api/.

// Build a reverse map: flat entity segment → domain path
// The CLI generates paths like "event/create/route.ts" — we need to remap to "events/event/commands/create/route.ts"
function toEntitySegment(entityName) {
  return entityName.toLowerCase();
}

const FLAT_SEGMENT_TO_DOMAIN = {};
for (const [entity, domain] of Object.entries(ENTITY_DOMAIN_MAP)) {
  FLAT_SEGMENT_TO_DOMAIN[toEntitySegment(entity)] = domain;
}

/**
 * Remap a staged relative path from the CLI's flat scheme to the domain scheme.
 *
 * CLI generates:  apps/api/app/api/event/create/route.ts
 * We want:        events/event/commands/create/route.ts  (relative to apps/api/app/api/)
 *
 * CLI generates:  apps/api/app/api/event/list/route.ts
 * We want:        events/event/list/route.ts
 */
function remapToDomainPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");

  // Strip the apps/api/app/api/ prefix that the CLI adds
  const apiPrefix = appDirPrefix;
  if (!normalized.startsWith(apiPrefix)) {
    return null; // Not an API route — skip (types, client, etc.)
  }

  const afterApi = normalized.slice(apiPrefix.length);
  // afterApi is like: event/create/route.ts  or  event/list/route.ts  or  event/:id/route.ts
  const parts = afterApi.split("/");
  if (parts.length < 2) return null;

  const entitySegment = parts[0];
  const domain = FLAT_SEGMENT_TO_DOMAIN[entitySegment];
  const entity = FLAT_SEGMENT_TO_ENTITY[entitySegment] ?? null;
  if (!domain) {
    console.warn(
      `[manifest/generate] No domain mapping for entity segment "${entitySegment}" — skipping`
    );
    return null;
  }

  const rest = parts.slice(1); // e.g. ["create", "route.ts"] or ["list", "route.ts"]
  const routeFile = rest[rest.length - 1]; // "route.ts"
  let commandOrAction = rest.slice(0, -1).join("/"); // e.g. "create" or ":id"

  if (
    entity &&
    (commandOrAction === ":id" || commandOrAction === "[id]")
  ) {
    commandOrAction = `[${resolveDetailSegment(entity)}]`;
  }

  // Command routes (non-list, non-detail) go under commands/
  const isReadRoute =
    commandOrAction === "list" ||
    commandOrAction.startsWith(":") ||
    commandOrAction.startsWith("[") ||
    commandOrAction === "";

  const domainPath = isReadRoute
    ? `${domain}/${commandOrAction}/${routeFile}`
    : `${domain}/commands/${commandOrAction}/${routeFile}`;

  return domainPath;
}

/**
 * Recover the Manifest entity name for a staged route path produced by the CLI.
 * The CLI emits flat paths like "apps/api/app/api/eventstaff/list/route.ts" where the first
 * segment is entityName.toLowerCase(). Returns null for non-route / unmapped paths.
 */
function entityForStagedPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const apiPrefix = appDirPrefix;
  if (!normalized.startsWith(apiPrefix)) return null;
  const segment = normalized.slice(apiPrefix.length).split("/")[0];
  return FLAT_SEGMENT_TO_ENTITY[segment] ?? null;
}

const GENERATED_MARKERS = [
  "Generated from Manifest IR - DO NOT EDIT",
  "@generated",
  "DO NOT EDIT - Changes will be overwritten",
];

const hasGeneratedMarker = (fileContents) =>
  GENERATED_MARKERS.some((marker) => fileContents.includes(marker));

const collectFiles = (rootDir) => {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!(current && existsSync(current))) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
  return files;
};

const getOutputDirFromArgs = (cliArgs) => {
  const outputFlagIndex = cliArgs.indexOf("--output");
  if (outputFlagIndex >= 0 && cliArgs[outputFlagIndex + 1]) {
    return cliArgs[outputFlagIndex + 1];
  }
  return defaultOutput;
};

const setOutputDirInArgs = (cliArgs, newOutputDir) => {
  const nextArgs = [...cliArgs];
  const outputFlagIndex = nextArgs.indexOf("--output");
  if (outputFlagIndex >= 0) {
    nextArgs[outputFlagIndex + 1] = newOutputDir;
    return nextArgs;
  }
  return [...nextArgs, "--output", newOutputDir];
};

/**
 * Load kitchen.commands.json and build the set of expected command route paths.
 * Returns a Set of normalized forward-slash relative paths like
 * "kitchen/prep-tasks/commands/create/route.ts".
 */
const loadExpectedCommandPaths = () => {
  const commandsManifestPath = getConfigPaths().commandsPath;
  if (!existsSync(commandsManifestPath)) {
    throw new Error(
      `[manifest/generate] kitchen.commands.json not found at ${commandsManifestPath}. Run manifest:compile first.`
    );
  }
  const commands = JSON.parse(readFileSync(commandsManifestPath, "utf8"));
  const expectedPaths = new Set();
  for (const cmd of commands) {
    const domain = ENTITY_DOMAIN_MAP[cmd.entity];
    if (!domain) {
      console.warn(
        `[manifest/generate] No domain mapping for entity "${cmd.entity}" in commands.json — skipping`
      );
      continue;
    }
    expectedPaths.add(`${domain}/commands/${cmd.command}/route.ts`);
  }
  return expectedPaths;
};

/**
 * Check if a normalized relative path is inside the commands namespace.
 */
const isCommandsNamespacePath = (relPath) => relPath.includes("/commands/");

/**
 * Detect exported HTTP methods from route file content.
 */
const detectExportedMethods = (content) => {
  const methods = [];
  const re =
    /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
  let match = re.exec(content);
  while (match) {
    methods.push(match[1]);
    match = re.exec(content);
  }
  return methods;
};

const materializeRemappedOutput = (stagingDir, outputDir) => {
  const copiedFiles = [];
  const droppedFiles = [];
  const rewrittenAccessors = [];
  const rewrittenFields = [];
  let skippedOverwriteCount = 0;

  // Load commands manifest (used for dispatcher validation messaging only)
  loadExpectedCommandPaths();

  // First pass: collect all staged route files and their domain paths
  const stagedRoutes = [];
  for (const stagedFile of collectFiles(stagingDir).filter((f) =>
    f.endsWith("route.ts")
  )) {
    const stagedContent = readFileSync(stagedFile, "utf8");
    if (!hasGeneratedMarker(stagedContent)) continue;

    const stagedRelativePath = relative(stagingDir, stagedFile);
    const domainRelativePath = remapToDomainPath(stagedRelativePath);
    if (!domainRelativePath) continue;

    const safeRelativePath = domainRelativePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (
      safeRelativePath.length === 0 ||
      safeRelativePath.startsWith("../") ||
      safeRelativePath.includes("/../")
    ) {
      throw new Error(
        `[manifest/generate] Refusing to write unsafe path: ${stagedRelativePath}`
      );
    }

    const entity = entityForStagedPath(stagedRelativePath);

    stagedRoutes.push({ stagedFile, stagedContent, safeRelativePath, entity });
  }

  // Validation pass: forward, mirror, and method checks
  const errors = [];

  for (const { stagedContent, safeRelativePath } of stagedRoutes) {
    const isCommandRoute = isCommandsNamespacePath(safeRelativePath);

    // Command POSTs use the singular manifest dispatcher — never materialize
    // per-command route files under domain/commands/* again.
    if (isCommandRoute) {
      continue;
    }

    // Method check for any stray command-shaped paths outside commands/
    const methods = detectExportedMethods(stagedContent);
    if (methods.includes("POST") && safeRelativePath.includes("/commands/")) {
      errors.push(
        `METHOD_CHECK_FAIL: Unexpected command route "${safeRelativePath}" — use manifest/[entity]/commands/[command] dispatcher`
      );
    }
  }

  // Legacy per-command routes are removed after list/detail materialization.
  if (errors.length > 0) {
    console.error(
      `[manifest/generate] Validation failed with ${errors.length} error(s):`
    );
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    throw new Error(
      `[manifest/generate] ${errors.length} validation error(s) — aborting materialization`
    );
  }

  // Copy pass: write read routes only (list/detail). Commands use dispatcher.
  for (const {
    stagedContent,
    safeRelativePath,
    entity,
  } of stagedRoutes) {
    if (isCommandsNamespacePath(safeRelativePath)) {
      continue;
    }

    const destinationPath = join(outputDir, safeRelativePath);

    // Resolve the correct Prisma accessor for this entity. The upstream nextjs projection
    // emits `database.<camelCase(entity)>` with no model-existence check, which produces
    // phantom accessors for entities whose Prisma model name differs (e.g. EventStaff →
    // model EventStaffAssignment) and breaks api typecheck/build. Rewrite drifted accessors
    // here; drop the route entirely for entities that map to no Prisma table.
    const { naive, accessor, drop, overridden } = entity
      ? resolveAccessor(entity)
      : { naive: null, accessor: null, drop: false, overridden: false };

    // A detail route is any read route under a dynamic segment (e.g. `[id]`/`[threadId]`);
    // list routes live under a static `list/` segment. Used for detail-only drops below.
    const isDetailRoute = safeRelativePath.includes("/[");

    if (drop || (isDetailRoute && entity && ENTITY_DETAIL_DROP.has(entity))) {
      // Either the entity has no Prisma table at all (drop both routes), or its model has no
      // single-column id so the by-id detail route can't be emitted (drop just the detail route).
      if (existsSync(destinationPath)) {
        const existing = readFileSync(destinationPath, "utf8");
        if (hasGeneratedMarker(existing)) {
          rmSync(destinationPath, { force: true });
          droppedFiles.push(safeRelativePath);
        }
      }
      continue;
    }

    if (existsSync(destinationPath)) {
      const destinationContent = readFileSync(destinationPath, "utf8");
      if (!hasGeneratedMarker(destinationContent)) {
        console.warn(
          `[manifest/generate] Skipping overwrite of non-generated route: ${destinationPath.replace(/\\/g, "/")}`
        );
        skippedOverwriteCount += 1;
        continue;
      }
    }

    let outputContent = stagedContent;
    if (overridden && accessor && naive) {
      const before = outputContent;
      outputContent = outputContent.replace(
        new RegExp(`database\\.${naive}\\b`, "g"),
        `database.${accessor}`
      );
      if (outputContent !== before) {
        rewrittenAccessors.push(
          `${safeRelativePath} (database.${naive} → database.${accessor})`
        );
      }
    }

    // Correct phantom Prisma field names (legacy snake_case models / missing created-at columns).
    // The upstream projection hardcodes `where: { tenantId }` / `orderBy: { createdAt }`; rewrite
    // those to the real field names for the few entities that need it (constitution §10 — fix the
    // producer + regenerate, never hand-edit the "DO NOT EDIT" route).
    const fieldResult = applyFieldOverrides(outputContent, entity);
    if (fieldResult.rewrites.length > 0) {
      outputContent = fieldResult.content;
      rewrittenFields.push(
        `${safeRelativePath} (${fieldResult.rewrites.join("; ")})`
      );
    }

    mkdirSync(resolve(destinationPath, ".."), { recursive: true });
    writeFileSync(destinationPath, outputContent, "utf8");
    copiedFiles.push(destinationPath.replace(/\\/g, "/"));
  }

  return {
    copiedFiles,
    skippedOverwriteCount,
    droppedFiles,
    rewrittenAccessors,
    rewrittenFields,
  };
};

/**
 * Remove legacy per-command route files. All command POSTs must use:
 * apps/api/app/api/manifest/[entity]/commands/[command]/route.ts
 */
const pruneLegacyCommandRoutes = (outputDir) => {
  const dispatcherRel = "manifest/[entity]/commands/[command]/route.ts";
  const deleted = [];

  for (const file of collectFiles(outputDir).filter((entry) =>
    entry.endsWith("route.ts")
  )) {
    const rel = relative(outputDir, file).replace(/\\/g, "/");
    if (!rel.includes("/commands/")) continue;
    if (rel === dispatcherRel) continue;

    const content = readFileSync(file, "utf8");
    if (
      content.includes("executeManifestCommand") ||
      content.includes("@generated") ||
      content.includes("Generated from Manifest")
    ) {
      rmSync(file, { force: true });
      deleted.push(rel);
    }
  }

  return deleted;
};

const outputDir = resolve(getOutputDirFromArgs(baseArgs));
const stagingDir = resolve(
  ".tmp",
  `manifest-generate-staging-${Date.now()}-${process.pid}`
);
mkdirSync(stagingDir, { recursive: true });

// Use the installed @angriff36/manifest CLI (pnpm exec manifest generate)
// The local vendored CLI at packages/manifest-runtime/packages/cli has a broken
// NextJsProjection import due to ESM/CJS interop issues with the workspace package.

// Run 1: Generate list routes (nextjs.route surface)
const routeArgs = [
  "exec",
  "manifest",
  "generate",
  ...setOutputDirInArgs(baseArgs, stagingDir),
];

// readRoutes.enabled (manifest.config.yaml → projections.nextjs.options.readRoutes)
// gates direct DB read-route generation. When false, no list/detail routes are emitted;
// the command dispatcher (below) is unaffected.
let routeResult = { status: 0 };
if (readRoutesEnabled) {
  console.log(
    "[manifest/generate] Generating list routes (nextjs.route surface)..."
  );
  routeResult = spawnSync(pnpmBin, routeArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: repoRoot,
  });
} else {
  console.log(
    "[manifest/generate] readRoutes.enabled=false — skipping read-route generation."
  );
}

// Run 2: Generate detail routes (nextjs.detail surface)
// The installed CLI (0.3.37) supportss the surface through its projection class,
// but the CLI's generate command doesn't support --surface detail yet.
// We call the projection directly via an inline script, bypassing the CLI.
const detailOutputDir = join(stagingDir, "apps/api/app/api");
const detailScript = `
import { NextJsProjection } from "@angriff36/manifest/projections/nextjs";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

async function main() {
  const irPath = resolve(${JSON.stringify(defaultIr)});
  const outputBase = resolve(${JSON.stringify(detailOutputDir)});
  const ir = JSON.parse(readFileSync(irPath, "utf8"));
  const projection = new NextJsProjection();

  let count = 0;
  for (const entity of ir.entities) {
    const result = projection.generate(ir, {
      surface: "nextjs.detail",
      entity: entity.name,
    });
    for (const artifact of result.artifacts) {
      if (!artifact.pathHint) continue;
      // pathHint includes "apps/api/app/api/<entity>/[id]/route.ts"
      // Strip the "apps/api/app/api/" prefix to get just "<entity>/[id]/route.ts"
      const hintRelative = artifact.pathHint.replace(/^apps\\/api\\/app\\/api\\//, "");
      const outputPath = resolve(outputBase, hintRelative);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, artifact.code, "utf8");
      count++;
    }
  }
  console.log('[manifest/generate:detail] Generated ' + count + ' detail routes');
}
main().catch(e => { console.error(e); process.exit(1); });
`;
const detailScriptPath = join(stagingDir, "_detail-gen.mjs");

let detailResult = { status: 0 };
if (readRoutesEnabled) {
  writeFileSync(detailScriptPath, detailScript, "utf8");
  console.log(
    "[manifest/generate] Generating detail routes (nextjs.detail surface)..."
  );
  detailResult = spawnSync("node", [detailScriptPath], {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: repoRoot,
  });
}

// Run 3: Generate the singular dynamic command dispatcher
// This is a single route at apps/api/app/api/manifest/[entity]/commands/[command]/route.ts
// No per-command physical route files are generated.
console.log("[manifest/generate] Generating singular command dispatcher...");

{
  const { dispatcherDir: dispatcherDirInfo } = getConfigPaths();
  mkdirSync(dispatcherDirInfo, { recursive: true });
  const dispatcherPathInfo = resolve(dispatcherDirInfo, "route.ts");

  const dispatcherCode = [
    "// @generated — Generated from Manifest IR. DO NOT EDIT.",
    "// Singular dynamic command dispatcher.",
    "// All domain command POSTs route through here → guards, policies, constraints, actions, events.",
    "",
    `import type { NextRequest } from "next/server";`,
    `import { captureException } from "@sentry/nextjs";`,
    `import { requireCurrentUser } from "@/app/lib/tenant";`,
    `import { manifestErrorResponse } from "@/lib/manifest-response";`,
    `import { runManifestCommand } from "@/lib/manifest/execute-command";`,
    "",
    `export const runtime = "nodejs";`,
    "",
    "export async function POST(",
    "  request: NextRequest,",
    "  { params }: { params: Promise<{ entity: string; command: string }> }",
    "): Promise<Response> {",
    "  try {",
    "    const { entity, command: commandSlug } = await params;",
    "    const currentUser = await requireCurrentUser();",
    "    const body = await request.json().catch(() => ({}));",
    "",
    "    return runManifestCommand({",
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
    "    if (error instanceof Error && error.name === \"InvariantError\") {",
    "      return manifestErrorResponse(error.message, 401);",
    "    }",
    "    captureException(error);",
    "    return manifestErrorResponse(\"Internal server error\", 500);",
    "  }",
    "}",
    "",
  ].join("\n");

  writeFileSync(dispatcherPathInfo, dispatcherCode, "utf8");
  console.log(`[manifest/generate] Wrote dispatcher → ${dispatcherPathInfo}`);
}

let guardFailure = false;
let copiedFiles = [];
let skippedOverwriteCount = 0;

if (routeResult.status === 0 && detailResult.status === 0) {
  try {
    const materializeResult = materializeRemappedOutput(stagingDir, outputDir);
    copiedFiles = materializeResult.copiedFiles;
    skippedOverwriteCount = materializeResult.skippedOverwriteCount;

    if (materializeResult.rewrittenAccessors.length > 0) {
      console.log(
        `[manifest/generate] Rewrote ${materializeResult.rewrittenAccessors.length} drifted Prisma accessor(s):`
      );
      for (const rel of materializeResult.rewrittenAccessors) {
        console.log(`  - ${rel}`);
      }
    }

    if (materializeResult.droppedFiles.length > 0) {
      console.log(
        `[manifest/generate] Dropped ${materializeResult.droppedFiles.length} read route(s) for entities with no Prisma table:`
      );
      for (const rel of materializeResult.droppedFiles) {
        console.log(`  - ${rel}`);
      }
    }

    if (materializeResult.rewrittenFields.length > 0) {
      console.log(
        `[manifest/generate] Rewrote phantom Prisma field name(s) in ${materializeResult.rewrittenFields.length} read route(s):`
      );
      for (const rel of materializeResult.rewrittenFields) {
        console.log(`  - ${rel}`);
      }
    }

    const pruned = pruneLegacyCommandRoutes(outputDir);
    if (pruned.length > 0) {
      console.log(
        `[manifest/generate] Pruned ${pruned.length} legacy per-command route file(s):`
      );
      for (const rel of pruned) {
        console.log(`  - ${rel}`);
      }
    }
  } catch (error) {
    console.error(
      `[manifest/generate] Failed while remapping generated output: ${error instanceof Error ? error.message : String(error)}`
    );
    guardFailure = true;
  }
}

if (existsSync(stagingDir)) {
  rmSync(stagingDir, { recursive: true, force: true });
}

if (copiedFiles.length > 0) {
  console.log(`[manifest/generate] Copied files (${copiedFiles.length}):`);
  for (const copiedFile of copiedFiles) {
    console.log(`  - ${copiedFile}`);
  }
} else {
  console.log("[manifest/generate] Copied files (0):");
}

if (skippedOverwriteCount > 0) {
  console.log(
    `[manifest/generate] Skipped non-generated overwrites: ${skippedOverwriteCount}`
  );
}

if (routeResult.status !== 0) {
  console.error(
    "[manifest/generate] List route generation failed. Check @angriff36/manifest CLI output above."
  );
  process.exit(1);
}

if (detailResult.status !== 0) {
  console.error(
    "[manifest/generate] Detail route generation failed. Check @angriff36/manifest CLI output above."
  );
  process.exit(1);
}

if (guardFailure) {
  process.exit(1);
}
