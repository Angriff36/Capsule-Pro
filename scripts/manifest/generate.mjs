#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const userArgs = process.argv.slice(2);
const defaultArgs = [
  "exec",
  "manifest",
  "generate",
  "packages/manifest-ir/ir/kitchen/kitchen.ir.json",
  "--projection",
  "nextjs",
  "--surface",
  "route",
  "--output",
  "apps/api/app/api/kitchen",
];

const args =
  userArgs.length > 0
    ? ["exec", "manifest", "generate", ...userArgs]
    : defaultArgs;

const getOutputDirFromArgs = (cliArgs) => {
  const outputFlagIndex = cliArgs.indexOf("--output");
  if (outputFlagIndex >= 0 && cliArgs[outputFlagIndex + 1]) {
    return cliArgs[outputFlagIndex + 1];
  }
  return "apps/api/app/api/kitchen";
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

const collectFiles = (rootDir) => {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !existsSync(current)) {
      continue;
    }
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

const stripKnownPrefixes = (relativePath) => {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("apps/api/app/api/kitchen/")) {
    return normalized.slice("apps/api/app/api/kitchen/".length);
  }
  if (normalized.startsWith("apps/api/app/api/")) {
    return normalized.slice("apps/api/app/api/".length);
  }
  return normalized;
};

const GENERATED_MARKERS = [
  "Generated from Manifest IR - DO NOT EDIT",
  "@generated",
  "DO NOT EDIT - Changes will be overwritten",
];

const hasGeneratedMarker = (fileContents) =>
  GENERATED_MARKERS.some((marker) => fileContents.includes(marker));

const materializeNormalizedOutput = (stagingDir, outputDir) => {
  const copiedFiles = [];
  let skippedOverwriteCount = 0;
  for (const stagedFile of collectFiles(stagingDir).filter((filePath) =>
    filePath.endsWith("route.ts")
  )) {
    const stagedContent = readFileSync(stagedFile, "utf8");
    if (!hasGeneratedMarker(stagedContent)) {
      continue;
    }

    const stagedRelativePath = relative(stagingDir, stagedFile);
    const normalizedRelativePath = stripKnownPrefixes(stagedRelativePath);
    const safeRelativePath = normalizedRelativePath
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

    const destinationPath = join(outputDir, safeRelativePath);
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

    mkdirSync(resolve(destinationPath, ".."), { recursive: true });
    copyFileSync(stagedFile, destinationPath);
    copiedFiles.push(destinationPath.replace(/\\/g, "/"));
  }
  return { copiedFiles, skippedOverwriteCount };
};

const hasDuplicatedApiSegment = (absolutePath, outputRoot) => {
  const relativePath = absolutePath
    .slice(outputRoot.length)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  return relativePath.includes("apps/api/app/api/");
};

const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const outputDir = resolve(getOutputDirFromArgs(args));
const stagingDir = resolve(
  ".tmp",
  `manifest-generate-staging-${Date.now()}-${process.pid}`
);
mkdirSync(stagingDir, { recursive: true });

const invocationArgs = setOutputDirInArgs(args, stagingDir);
const result = spawnSync(bin, invocationArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

let guardFailure = false;
let duplicatedRoutes = [];
let copiedFiles = [];
let skippedOverwriteCount = 0;

if (result.status === 0) {
  try {
    const nestedAppsDir = join(outputDir, "apps");
    if (existsSync(nestedAppsDir)) {
      rmSync(nestedAppsDir, { recursive: true, force: true });
    }
    const materializeResult = materializeNormalizedOutput(stagingDir, outputDir);
    copiedFiles = materializeResult.copiedFiles;
    skippedOverwriteCount = materializeResult.skippedOverwriteCount;
    const generatedRoutes = collectFiles(outputDir).filter((filePath) =>
      filePath.endsWith("route.ts")
    );
    duplicatedRoutes = generatedRoutes.filter((filePath) =>
      hasDuplicatedApiSegment(filePath, outputDir)
    );
  } catch (error) {
    console.error(
      `[manifest/generate] Failed while normalizing generated output: ${error instanceof Error ? error.message : String(error)}`
    );
    guardFailure = true;
  }
}

if (duplicatedRoutes.length > 0) {
  const nestedAppsDir = join(outputDir, "apps");
  if (existsSync(nestedAppsDir)) {
    rmSync(nestedAppsDir, { recursive: true, force: true });
  }

  console.error(
    "[manifest/generate] Guard failed: duplicated nested output path detected (contains '/apps/api/app/api/' within output root)."
  );
  for (const path of duplicatedRoutes) {
    console.error(`  - ${path.replace(/\\/g, "/")}`);
  }
  guardFailure = true;
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

if (result.status !== 0) {
  console.error(
    "[manifest/generate] Generation failed. Ensure @manifest/runtime has built dist projection artifacts."
  );
}

if (guardFailure) {
  process.exit(1);
}

process.exit(result.status ?? 1);
