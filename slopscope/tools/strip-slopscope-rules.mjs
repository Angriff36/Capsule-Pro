#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";

function printUsageAndExit() {
  console.error(`
Usage:
  node strip-slopscope-rules.mjs <input-file> [output-file]
`);
  process.exit(1);
}

function isRuleDiscoveryHeading(line) {
  return /^##\s+\[[^\]]+\]\s+Rule Discovery\s+—\s+/.test(line);
}

function isMarkdownSectionHeading(line) {
  return /^###\s+/.test(line);
}

function getWantedSectionName(line) {
  const match = line.match(/^###\s+(Finding|Evidence)\s*$/i);
  return match ? match[1].toLowerCase() : null;
}

function normalizeBlankLines(text) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trimEnd()
    .concat("\n");
}

function stripToFindingsAndEvidence(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  const output = [];
  let insideRule = false;
  let activeSection = null;
  let insideFence = false;
  let keptRuleCount = 0;

  for (const line of lines) {
    const fenceLine = /^\s*```/.test(line);

    if (!insideFence && isRuleDiscoveryHeading(line)) {
      if (output.length > 0) {
        output.push("");
        output.push("---");
        output.push("");
      }

      output.push(line);
      insideRule = true;
      activeSection = null;
      insideFence = false;
      keptRuleCount += 1;
      continue;
    }

    if (!insideRule) {
      continue;
    }

    if (!insideFence) {
      const wantedSection = getWantedSectionName(line);

      if (wantedSection) {
        if (output.length > 0 && output.at(-1) !== "") {
          output.push("");
        }

        output.push(`### ${wantedSection === "finding" ? "Finding" : "Evidence"}`);
        activeSection = wantedSection;
        continue;
      }

      if (isMarkdownSectionHeading(line)) {
        activeSection = null;
        continue;
      }

      if (/^---\s*$/.test(line)) {
        activeSection = null;
        continue;
      }
    }

    if (activeSection) {
      output.push(line);

      if (fenceLine) {
        insideFence = !insideFence;
      }
    }
  }

  return {
    text: normalizeBlankLines(output.join("\n")),
    keptRuleCount,
  };
}

async function main() {
  const inputPath = process.argv[2];
  const requestedOutputPath = process.argv[3];

  if (!inputPath) {
    printUsageAndExit();
  }

  const resolvedInputPath = resolve(inputPath);
  const inputExt = extname(resolvedInputPath);
  const inputBase = basename(resolvedInputPath, inputExt);
  const defaultOutputPath = join(
    dirname(resolvedInputPath),
    `${inputBase}.findings-evidence${inputExt || ".md"}`
  );

  const outputPath = resolve(requestedOutputPath || defaultOutputPath);

  if (resolvedInputPath === outputPath) {
    console.error("Refusing to overwrite the input file. Provide a different output path.");
    process.exit(1);
  }

  const source = await readFile(resolvedInputPath, "utf8");
  const result = stripToFindingsAndEvidence(source);

  await writeFile(outputPath, result.text, "utf8");

  console.log(`Cleaned ${result.keptRuleCount} rule discoveries.`);
  console.log(`Wrote: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
