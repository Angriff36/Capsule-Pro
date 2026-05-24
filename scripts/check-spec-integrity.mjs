#!/usr/bin/env node
/**
 * check-spec-integrity.mjs
 *
 * CI guard for the docs app. Fails if:
 *  1. Any .mdx file under apps/docs/content/docs/ is missing title or description frontmatter.
 *  2. Any internal /docs/ href in an .mdx file points to a slug with no corresponding content file.
 *
 * Usage: node scripts/check-spec-integrity.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(__dirname, "../apps/docs/content/docs");

// ── Helpers ───────────────────────────────────────────────────────────────────

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (extname(entry.name) === ".mdx") files.push(full);
  }
  return files;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const raw = match[1];
  const result = {};
  for (const line of raw.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = val;
  }
  return result;
}

/** Convert a /docs/foo/bar slug to the expected file path under DOCS_ROOT */
function slugToPath(slug) {
  // strip leading /docs/
  const rel = slug.replace(/^\/docs\/?/, "");
  if (!rel) return join(DOCS_ROOT, "index.mdx");
  // try exact match, then index file
  return rel; // resolved below
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const files = await walk(DOCS_ROOT);
  const errors = [];

  // Build a set of all known slugs for link checking
  const knownSlugs = new Set();
  for (const file of files) {
    const rel = relative(DOCS_ROOT, file).replace(/\\/g, "/").replace(/\.mdx$/, "");
    // index files map to their parent slug
    const slug = rel === "index" ? "" : rel.replace(/\/index$/, "");
    knownSlugs.add(slug);
  }

  for (const file of files) {
    const rel = relative(DOCS_ROOT, file).replace(/\\/g, "/");
    const content = await readFile(file, "utf8");

    // 1. Frontmatter check
    const fm = parseFrontmatter(content);
    if (!fm.title) errors.push(`MISSING title: ${rel}`);
    if (!fm.description) errors.push(`MISSING description: ${rel}`);

    // 2. Internal link check — find href="/docs/..." patterns
    const linkRe = /href=["']\/docs\/([^"'#?]*)["']/g;
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const slug = m[1].replace(/\/$/, ""); // strip trailing slash
      // Accept if slug itself or slug/index exists
      if (!knownSlugs.has(slug) && !knownSlugs.has(`${slug}/index`)) {
        errors.push(`BROKEN LINK in ${rel}: /docs/${slug || "(root)"}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("\nSpec integrity check FAILED:\n");
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error(`\n${errors.length} issue(s) found.\n`);
    process.exit(1);
  }

  console.log(`✓ Spec integrity OK — checked ${files.length} files, 0 issues.\n`);
}

main().catch((err) => {
  console.error("check-spec-integrity: unexpected error:", err);
  process.exit(1);
});
