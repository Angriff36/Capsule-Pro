#!/usr/bin/env node
/** Remove @repo/database import when no runtime database/Prisma usage remains. */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");

function walk(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (["node_modules", ".next-dev", ".next", "__tests__"].includes(name)) {
        continue;
      }
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function hasRuntimeUsage(text) {
  const code = stripComments(text);
  return (
    /\bdatabase\s*[.[(]/.test(code) ||
    /\bdatabase\s*\.\s*\$/.test(code) ||
    /\bPrisma\s*\./.test(code) ||
    /\$queryRaw/.test(code) ||
    /\$executeRaw/.test(code) ||
    /\$transaction/.test(code)
  );
}

let removed = 0;
for (const file of walk(join(ROOT, "apps/app"))) {
  let text = readFileSync(file, "utf8");
  if (!/@repo\/database/.test(text)) continue;
  if (hasRuntimeUsage(text)) continue;

  const next = text
    .replace(
      /^import\s*\{[^}]*\}\s*from\s*["']@repo\/database["'];\n?/gm,
      ""
    )
    .replace(
      /^import\s+type\s*\{[^}]*\}\s*from\s*["']@repo\/database["'];\n?/gm,
      ""
    );
  if (next !== text) {
    removed++;
    if (APPLY) writeFileSync(file, next);
    console.log(relative(ROOT, file));
  }
}
console.log(`\n${APPLY ? "Removed" : "Would remove"} dead imports in ${removed} files`);
if (!APPLY) console.log("Pass --apply to write.");
