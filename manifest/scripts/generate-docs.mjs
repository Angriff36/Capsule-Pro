#!/usr/bin/env node
/**
 * Generate Manifest API reference docs from the compiled IR.
 *
 * Upstream `manifest docs` includes every global policy (no entity/module) on
 * every entity page. This script runs the CLI then filters each entity page to
 * policies that belong to that entity or its commands.
 *
 * Usage:
 *   node manifest/scripts/generate-docs.mjs
 *   node manifest/scripts/generate-docs.mjs --format markdown --output docs-site-md
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");

const args = process.argv.slice(2);
const formatArg = args.find((a) => a.startsWith("--format="))?.split("=")[1]
  ?? (args.includes("--format") ? args[args.indexOf("--format") + 1] : "html");
const outputArg = args.find((a) => a.startsWith("--output="))?.split("=")[1]
  ?? (args.includes("--output") ? args[args.indexOf("--output") + 1] : "docs-site");

const format = formatArg === "markdown" ? "markdown" : "html";
const ext = format === "markdown" ? "md" : "html";
const outputDir = join(root, outputArg);

const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

/** Policies relevant to one entity (excludes upstream global catch-all). */
function entityPolicyNames(entityName) {
  const entity = ir.entities.find((e) => e.name === entityName);
  if (!entity) return new Set();

  const names = new Set([
    ...(entity.policies ?? []),
    ...(entity.defaultPolicies ?? []),
    ...ir.commands
      .filter((c) => c.entity === entityName)
      .flatMap((c) => c.policies ?? []),
  ]);

  for (const policy of ir.policies) {
    if (policy.entity === entityName) names.add(policy.name);
  }

  return names;
}

function filterMarkdownPolicies(content, allowed) {
  const marker = "## Policies\n";
  const start = content.indexOf(marker);
  if (start === -1) return content;

  const tail = content.slice(start + marker.length);
  const nextHeading = tail.search(/\n## /);
  const section = nextHeading === -1 ? tail : tail.slice(0, nextHeading);
  const after = nextHeading === -1 ? "" : tail.slice(nextHeading);

  const lines = section.split("\n");
  const kept = [];
  let inRows = false;

  for (const line of lines) {
    if (line.startsWith("| Name |")) {
      kept.push(line);
      inRows = true;
      continue;
    }
    if (line.startsWith("|------|")) {
      kept.push(line);
      continue;
    }
    if (inRows && line.startsWith("| `")) {
      const match = line.match(/^\| `([^`\\|]+)`/);
      if (match && allowed.has(match[1])) kept.push(line);
      continue;
    }
    if (!inRows) kept.push(line);
  }

  const hasRows = kept.some((l) => l.startsWith("| `"));
  if (!hasRows) return content.slice(0, start) + after;

  return `${content.slice(0, start)}${marker}${kept.join("\n")}\n${after}`;
}

function filterHtmlPolicies(content, allowed) {
  const marker = "<h2>Policies</h2>";
  const start = content.indexOf(marker);
  if (start === -1) return content;

  const tail = content.slice(start);
  const nextHeading = tail.search(/<h2>(?!Policies)/);
  const section = nextHeading === -1 ? tail : tail.slice(0, nextHeading);
  const after = nextHeading === -1 ? "" : tail.slice(nextHeading);

  const rows = section.match(/<tr>\s*<td><code>[^<]+<\/code><\/td>[\s\S]*?<\/tr>/g) ?? [];
  const keptRows = rows.filter((row) => {
    const match = row.match(/<td><code>([^<]+)<\/code><\/td>/);
    return match && allowed.has(match[1]);
  });

  if (keptRows.length === 0) {
    return content.slice(0, start) + after;
  }

  const tableStart = section.indexOf("<table>");
  const tableEnd = section.indexOf("</table>") + "</table>".length;
  const header = section.slice(0, tableStart);
  const table = `${header}<table>
<thead><tr><th>Name</th><th>Action</th><th>Expression</th><th>Message</th></tr></thead>
<tbody>
${keptRows.join("\n")}
</tbody>
</table>`;

  return content.slice(0, start) + table + (after.startsWith("\n") ? after : `\n${after}`);
}

function filterEntityPage(entityName, content) {
  const allowed = entityPolicyNames(entityName);
  return format === "markdown"
    ? filterMarkdownPolicies(content, allowed)
    : filterHtmlPolicies(content, allowed);
}

execSync(
  `pnpm exec manifest docs "${IR_PATH}" --format ${format} --output "${outputArg}"`,
  { cwd: root, stdio: "inherit" },
);

let fixed = 0;
for (const entity of ir.entities) {
  const filePath = join(outputDir, `${entity.name}.${ext}`);
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    continue;
  }
  const filtered = filterEntityPage(entity.name, content);
  if (filtered !== content) {
    writeFileSync(filePath, filtered, "utf8");
    fixed++;
  }
}

console.log(`Filtered policies on ${fixed} entity page(s) → ${outputDir}`);
