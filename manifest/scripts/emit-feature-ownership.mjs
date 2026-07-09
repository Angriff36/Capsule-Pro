#!/usr/bin/env node
// Emit feature-ownership.json: every entity -> canonical product ownership
// (productArea + feature + source path + API segment). The analyzer consumes
// this as PRIMARY ownership truth — hierarchy = ownership.
//
// Derivation order (no entity-name inference):
//   1. Two-level+ manifest/source/<productArea>/<feature>/ → path is authoritative
//   2. Flat manifest/source/<productArea>/ → feature from source filename stem
//   3. Explicit SOURCE_FEATURE_OVERRIDES (basename → feature slug)
//   4. routeSegments apiSegment second segment when flat area and stem is ambiguous
//
//   node manifest/scripts/emit-feature-ownership.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const SRC = path.join(ROOT, "manifest/source");
const OUT = path.join(ROOT, "manifest/feature-ownership.json");
const CHECK = process.argv.includes("--check");
const norm = (p) => p.replace(/\\/g, "/");

/** basename (no .manifest) → feature slug when stem logic is insufficient. */
const SOURCE_FEATURE_OVERRIDES = {
  "chart-of-account-rules": "chart-of-accounts",
  "revenue-recognition-rules": "revenue-recognition",
};

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.name.endsWith(".manifest")) {
      yield full;
    }
  }
}

function sourceStemToFeature(basename) {
  if (SOURCE_FEATURE_OVERRIDES[basename]) {
    return SOURCE_FEATURE_OVERRIDES[basename];
  }
  return basename
    .replace(/-sel-rules$/, "")
    .replace(/-extended-rules$/, "")
    .replace(/-all-rules$/, "")
    .replace(/-workflow$/, "")
    .replace(/-rules$/, "");
}

/**
 * Resolve productArea + feature from manifest source path (authoritative).
 * Flat product areas use the source filename stem — not entity names.
 */
function resolveSourceOwnership(absFile) {
  const rel = norm(path.relative(SRC, absFile));
  const dir = path.posix.dirname(rel);
  const basename = path.basename(absFile, ".manifest");
  const sourceFile = norm(path.relative(ROOT, absFile));

  if (dir === ".") {
    const feature = sourceStemToFeature(basename);
    return {
      productArea: "(root)",
      feature,
      canonicalFeature: feature,
      sourceFile,
      sourceManifest: path.posix.basename(rel),
    };
  }

  const parts = dir.split("/");
  const productArea = parts[0];

  if (parts.length >= 2) {
    const feature = parts.slice(1).join("/");
    return {
      productArea,
      feature,
      canonicalFeature: `${productArea}/${feature}`,
      sourceFile,
      sourceManifest: path.posix.basename(rel),
      sourceDepth: "feature",
    };
  }

  const feature = sourceStemToFeature(basename);
  return {
    productArea,
    feature,
    canonicalFeature: `${productArea}/${feature}`,
    sourceFile,
    sourceManifest: path.posix.basename(absFile),
    sourceDepth: "area-only",
  };
}

/**
 * Priority-4 routeSegments refinement — only for flat product areas (sourceDepth area-only).
 * Two-level manifest/source/<area>/<feature>/ paths are authoritative and skip this.
 */
function refineFromApiSegment(ownership, apiSegment) {
  if (!apiSegment || ownership.sourceDepth === "feature") return ownership;
  const parts = apiSegment.split("/").filter(Boolean);
  if (parts.length < 2) return ownership;
  const apiArea = parts[0];
  const apiFeature = parts.slice(1).join("/");
  if (apiArea === ownership.productArea) {
    return {
      ...ownership,
      feature: apiFeature,
      canonicalFeature: `${apiArea}/${apiFeature}`,
    };
  }
  return {
    ...ownership,
    productArea: apiArea,
    feature: apiFeature,
    canonicalFeature: `${apiArea}/${apiFeature}`,
    apiDerived: true,
  };
}

const SEGMENT_RE = /^\s{6,}([A-Z][A-Za-z0-9]+):\s*"([^"/]+\/[^"]+)"\s*$/;
const BLOCK_EXIT_RE = /^\s{0,4}\w/;

function readRouteSegments() {
  const cfg = fs.readFileSync(path.join(ROOT, "manifest.config.yaml"), "utf8");
  const seg = {};
  const start = cfg.indexOf("routeSegments:");
  const slice = start >= 0 ? cfg.slice(start) : cfg;
  for (const line of slice.split("\n")) {
    const mm = SEGMENT_RE.exec(line);
    if (mm) {
      seg[mm[1]] = mm[2];
    } else if (BLOCK_EXIT_RE.test(line) && !line.includes("routeSegments")) {
      break;
    }
  }
  return seg;
}

const ENTITY_RE = /^\s*(?:external\s+)?entity\s+([A-Z][A-Za-z0-9]*)/gm;
const COMMAND_RE = /^\s*(?:async\s+)?command\s+([a-z][A-Za-z0-9]*)\s*\(/gm;

const segments = readRouteSegments();
const entities = {};
const sourcePathsByFeature = new Map();

for (const abs of walk(SRC)) {
  if (path.basename(abs) === "_base.manifest") {
    continue;
  }
  const src = fs.readFileSync(abs, "utf8");
  let ownership = resolveSourceOwnership(abs);
  const sourceFile = ownership.sourceFile;

  const names = [...src.matchAll(ENTITY_RE)].map((m) => ({
    name: m[1],
    idx: m.index,
  }));

  for (let i = 0; i < names.length; i++) {
    const { name, idx } = names[i];
    const end = i + 1 < names.length ? names[i + 1].idx : src.length;
    const body = src.slice(idx, end);
    const commands = [...body.matchAll(COMMAND_RE)].map((m) => m[1]);
    const apiSegment = segments[name] ?? null;
    const refined = refineFromApiSegment(ownership, apiSegment);

    entities[name] = {
      productArea: refined.productArea,
      feature: refined.feature,
      canonicalFeature: refined.canonicalFeature,
      /** @deprecated use canonicalFeature — kept for one release of downstream tools */
      legacyFeature: refined.canonicalFeature,
      sourceFile,
      sourceManifest: refined.sourceManifest,
      apiSegment,
      commands: commands.sort(),
      ...(refined.apiDerived ? { apiDerived: true } : {}),
    };

    if (!sourcePathsByFeature.has(refined.canonicalFeature)) {
      sourcePathsByFeature.set(refined.canonicalFeature, new Set());
    }
    sourcePathsByFeature.get(refined.canonicalFeature).add(sourceFile);
  }
}

const ordered = Object.fromEntries(
  Object.keys(entities)
    .sort()
    .map((k) => [k, entities[k]])
);

const canonicalFeatures = [
  ...new Set(Object.values(ordered).map((e) => e.canonicalFeature)),
].sort();

const productAreas = [
  ...new Set(Object.values(ordered).map((e) => e.productArea)),
].sort();

const payload = {
  $comment:
    "GENERATED by manifest/scripts/emit-feature-ownership.mjs. productArea + feature from source taxonomy; flat areas use source filename stem. Do not hand-edit.",
  schema: "manifest/feature-ownership",
  version: 2,
  entityCount: Object.keys(ordered).length,
  productAreas,
  features: canonicalFeatures,
  sourcePathsByFeature: Object.fromEntries(
    [...sourcePathsByFeature.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, [...v].sort()])
  ),
  entities: ordered,
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== json) {
    console.error(
      "feature-ownership.json is stale. Run: node manifest/scripts/emit-feature-ownership.mjs"
    );
    process.exit(1);
  }
  console.log(
    `feature-ownership.json in sync (${payload.entityCount} entities, ${payload.features.length} features).`
  );
} else {
  fs.writeFileSync(OUT, json);
  console.log(
    `wrote ${norm(path.relative(ROOT, OUT))}: ${payload.entityCount} entities across ${payload.features.length} canonical features in ${payload.productAreas.length} product areas.`
  );
}
