#!/usr/bin/env node
/**
 * Migrate database.* calls to manifest-client.generated list/get helpers.
 * Replaces findMany/findFirst/findUnique/count with Convex-backed reads.
 * Does NOT handle raw SQL, $transaction, or write methods — those stay for manual port.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { resolveAccessor } from "./accessor-resolution.mjs";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const SCAN_DIRS = [join(ROOT, "apps/app")];

const ir = JSON.parse(
  readFileSync(join(ROOT, "manifest/ir/kitchen.ir.json"), "utf8")
);
const plural = (s) =>
  /(s|x|z|ch|sh)$/.test(s) ? `${s}es` : /y$/.test(s) ? `${s.slice(0, -1)}ies` : `${s}s`;

/** accessor → { entity, listFn, getFn } */
const accessorMap = new Map();
for (const entity of (ir.entities ?? []).map((e) => e.name)) {
  const { accessor, drop } = resolveAccessor(entity);
  if (drop || !accessor) continue;
  accessorMap.set(accessor, {
    entity,
    listFn: `list${plural(entity)}`,
    getFn: `get${entity}`,
  });
}

const READ_METHODS = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "count",
]);
const SKIP_METHODS = new Set([
  "create",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
  "createMany",
  "aggregate",
  "groupBy",
]);

const CALL_RE =
  /(?:await\s+)?database\.([a-zA-Z0-9_]+)\s*\.\s*(findMany|findFirst|findUnique|count|aggregate|groupBy|create|update|updateMany|delete|deleteMany|upsert|createMany|\$queryRaw|\$queryRawUnsafe|\$executeRaw|\$executeRawUnsafe|\$transaction)\s*\(/g;

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

function sliceBalancedParens(text, openParenIdx) {
  let depth = 0;
  for (let i = openParenIdx; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return text.slice(openParenIdx, i + 1);
    }
  }
  return null;
}

function extractIdFromArgs(argsText) {
  const m =
    argsText.match(/where\s*:\s*\{\s*id\s*:\s*([^,}\s]+)/) ??
    argsText.match(/where\s*:\s*\{\s*id\s*:\s*([^}]+)\}/);
  return m?.[1]?.trim() ?? null;
}

function mergeManifestImports(text, needed) {
  if (needed.size === 0) return text;
  const re =
    /import\s*\{([^}]+)\}\s*from\s*"@\/app\/lib\/manifest-client\.generated";/;
  if (re.test(text)) {
    return text.replace(re, (_, names) => {
      const existing = names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const merged = [...new Set([...existing, ...needed])].sort();
      return `import { ${merged.join(", ")} } from "@/app/lib/manifest-client.generated";`;
    });
  }
  const imp = `import { ${[...needed].sort().join(", ")} } from "@/app/lib/manifest-client.generated";\n`;
  return text.replace(/^((?:["']use server["'];\n)?)/, `$1${imp}`);
}

function removeDatabaseImport(text) {
  if (/\bdatabase\b/.test(text.replace(/from\s+["']@repo\/database["']/g, ""))) {
    return text;
  }
  return text
    .replace(
      /^import\s*\{[^}]*\}\s*from\s*["']@repo\/database["'];\n?/gm,
      ""
    )
    .replace(
      /^import\s+type\s*\{[^}]*\}\s*from\s*["']@repo\/database["'];\n?/gm,
      ""
    );
}

function migrateTypeImports(text) {
  const typeImportRe =
    /^import\s+type\s*\{([^}]+)\}\s*from\s*["']@repo\/database["'];?\n?/gm;
  let out = text;
  let m;
  const types = new Set();
  while ((m = typeImportRe.exec(text)) !== null) {
    for (const t of m[1].split(",")) {
      const name = t.trim();
      if (name && name !== "PrismaClient") types.add(name);
    }
  }
  if (types.size === 0) return out;
  out = out.replace(typeImportRe, "");
  const typeImp = `import type { ${[...types].sort().join(", ")} } from "@/app/lib/manifest-types.generated";\n`;
  if (/from\s+"@\/app\/lib\/manifest-types\.generated"/.test(out)) {
    return out.replace(
      /import\s+type\s*\{([^}]+)\}\s*from\s*"@\/app\/lib\/manifest-types\.generated";/,
      (_, names) => {
        const existing = names
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const merged = [...new Set([...existing, ...types])].sort();
        return `import type { ${merged.join(", ")} } from "@/app/lib/manifest-types.generated";`;
      }
    );
  }
  return out.replace(/^((?:["']use client["'];\n)?)/, `$1${typeImp}`);
}

function migrateFile(file) {
  let text = readFileSync(file, "utf8");
  if (!/@repo\/database/.test(text)) {
    return { changed: false, reads: 0, skipped: 0 };
  }

  text = migrateTypeImports(text);
  const needed = new Set();
  let reads = 0;
  let skipped = 0;
  const hits = [];

  CALL_RE.lastIndex = 0;
  let m;
  while ((m = CALL_RE.exec(text)) !== null) {
    const accessor = m[1];
    const method = m[2];
    const callStart = m.index;
    const openIdx = m.index + m[0].length - 1;
    const args = sliceBalancedParens(text, openIdx);
    if (!args) continue;
    const prefix = text.slice(Math.max(0, callStart - 7), callStart);
    const hasAwait = /await\s*$/.test(prefix);
    const fullLen = m[0].length + args.length - 1;
    hits.push({ callStart, fullLen, hasAwait, accessor, method, args });
  }

  hits.sort((a, b) => b.callStart - a.callStart);

  for (const h of hits) {
    const map = accessorMap.get(h.accessor);
    if (!map) {
      skipped++;
      continue;
    }
    if (SKIP_METHODS.has(h.method) || h.method.startsWith("$")) {
      skipped++;
      continue;
    }
    if (!READ_METHODS.has(h.method)) {
      skipped++;
      continue;
    }

    const start = h.hasAwait ? h.callStart - 6 : h.callStart;
    const end = h.callStart + h.fullLen;
    let rep;

    if (h.method === "findMany" || h.method === "count") {
      needed.add(map.listFn);
      rep = h.hasAwait
        ? `(await ${map.listFn}()).data`
        : `(await ${map.listFn}()).data`;
      if (h.method === "count") {
        rep = `${rep}.length`;
      }
    } else if (h.method === "findUnique" || h.method === "findFirst") {
      const idExpr = extractIdFromArgs(h.args);
      if (idExpr) {
        needed.add(map.getFn);
        rep = h.hasAwait
          ? `(await ${map.getFn}(${idExpr})) ?? null`
          : `(await ${map.getFn}(${idExpr})) ?? null`;
      } else {
        needed.add(map.listFn);
        rep = h.hasAwait
          ? `(await ${map.listFn}()).data[0] ?? null`
          : `(await ${map.listFn}()).data[0] ?? null`;
      }
    } else {
      skipped++;
      continue;
    }

    text = text.slice(0, start) + rep + text.slice(end);
    reads++;
  }

  if (reads > 0) {
    text = mergeManifestImports(text, needed);
  }
  text = removeDatabaseImport(text);

  const stillUsesDatabase =
    /\bdatabase\s*\./.test(text) ||
    /\bPrisma\s*\./.test(text) ||
    /\$queryRaw/.test(text);

  if (!stillUsesDatabase) {
    text = text
      .replace(
        /^import\s*\{[^}]*\bPrisma\b[^}]*\}\s*from\s*["']@repo\/database["'];\n?/gm,
        ""
      )
      .replace(
        /^import\s*\{[^}]*\bdatabase\b[^}]*\}\s*from\s*["']@repo\/database["'];\n?/gm,
        ""
      );
  }

  const changed = reads > 0 || migrateTypeImports(readFileSync(file, "utf8")) !== readFileSync(file, "utf8");
  if (APPLY && (reads > 0 || text !== readFileSync(file, "utf8"))) {
    writeFileSync(file, text);
  }
  return { changed: reads > 0, reads, skipped };
}

let totalReads = 0;
let totalFiles = 0;
let totalSkipped = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const r = migrateFile(file);
    if (r.reads > 0) {
      totalFiles++;
      totalReads += r.reads;
      totalSkipped += r.skipped;
      if (APPLY) {
        console.log(
          `${relative(ROOT, file)}: ${r.reads} reads migrated, ${r.skipped} skipped`
        );
      }
    }
  }
}

console.log(
  `\n${APPLY ? "Applied" : "Dry run"}: ${totalReads} read call sites in ${totalFiles} files (${totalSkipped} skipped in those files)`
);
if (!APPLY) {
  console.log("Pass --apply to write changes.");
}
