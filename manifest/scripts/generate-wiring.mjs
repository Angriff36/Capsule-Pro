#!/usr/bin/env node

/**
 * Native config-driven wiring projection.
 *
 * Emits the Manifest product wiring contract (+ safe bindings) from the merged
 * IR using `projections.wiring` in manifest.config.yaml. Consumed by
 * `manifest wiring-inspect` / `manifest wiring-remediate`.
 *
 * Artifacts land under the configured output (default: manifest/generated/wiring/)
 * and are gitignored like other IR projection artifacts under manifest/generated/*.
 *
 * Config: manifest.config.yaml → projections.wiring.{output,options}
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { WiringProjection } from "@angriff36/manifest/projections/wiring";
import { getConfigPaths, readConfig } from "./read-config.mjs";

const { repoRoot, irPath } = getConfigPaths();
const cfg = readConfig();
const wiringCfg = cfg.projections?.wiring ?? {};
const nextjsOptions = cfg.projections?.nextjs?.options ?? {};
const outputRel = wiringCfg.output || "manifest/generated/wiring";
const wiringOptions = wiringCfg.options ?? {};

if (!wiringCfg.output) {
  console.warn(
    "[manifest/wiring] projections.wiring.output missing — using default manifest/generated/wiring"
  );
}

// Inherit route identity from the nextjs projection when wiring options omit it —
// one source of truth for entity → URL segment mapping.
const options = {
  dateSerialization: nextjsOptions.dateSerialization ?? "iso-string",
  routeSegments: nextjsOptions.routeSegments,
  apiBasePath: "/api",
  dispatcherBasePath: "/api/manifest",
  runtimeImportPath: "@/lib/manifest/execute-command",
  ...wiringOptions,
  routeSegments: wiringOptions.routeSegments ?? nextjsOptions.routeSegments,
};

const outputDir = resolve(repoRoot, outputRel);
const ir = JSON.parse(readFileSync(irPath, "utf8"));
const projection = new WiringProjection();

const result = projection.generate(ir, {
  surface: "wiring.all",
  options,
});

for (const diagnostic of result.diagnostics ?? []) {
  const tag = `[manifest/wiring] ${diagnostic.severity}: ${diagnostic.code}`;
  if (diagnostic.severity === "error") {
    console.error(`${tag} — ${diagnostic.message}`);
  } else {
    console.log(`${tag} — ${diagnostic.message}`);
  }
}

const errors = (result.diagnostics ?? []).filter((d) => d.severity === "error");
if (errors.length > 0) {
  process.exit(1);
}

if (!result.artifacts?.length) {
  console.error("[manifest/wiring] No artifacts produced. Aborting.");
  process.exit(1);
}

const repoRelative = (absPath) =>
  relative(repoRoot, absPath).split("\\").join("/");

const generationRecords = [];
let written = 0;

for (const artifact of result.artifacts) {
  if (!artifact.pathHint) {
    continue;
  }
  // pathHint is relative to the projection output directory (CLI convention).
  const destination = resolve(outputDir, artifact.pathHint);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, artifact.code, "utf8");
  written += 1;
  generationRecords.push({
    artifactId: artifact.id,
    surface: "wiring.all",
    entity: null,
    command: null,
    pathHint: artifact.pathHint,
    outputFile: repoRelative(destination),
  });
}

const generationManifest = {
  schema: "manifest/generation-manifest",
  version: 1,
  artifacts: generationRecords.sort(
    (a, b) =>
      a.outputFile.localeCompare(b.outputFile) ||
      a.artifactId.localeCompare(b.artifactId)
  ),
  dispatchers: [],
};

const generationManifestPath = join(outputDir, "generation.manifest.json");
writeFileSync(
  generationManifestPath,
  `${JSON.stringify(generationManifest, null, 2)}\n`,
  "utf8"
);

console.log(
  `[manifest/wiring] Wrote ${written} artifact(s) → ${repoRelative(outputDir)}`
);
for (const record of generationRecords) {
  console.log(`  • ${record.artifactId}: ${record.outputFile}`);
}
