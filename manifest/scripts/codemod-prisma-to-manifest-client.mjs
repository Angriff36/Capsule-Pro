#!/usr/bin/env node
/**
 * Aggressive database.* read → manifest-client.generated rewrite.
 *   node manifest/scripts/codemod-prisma-to-manifest-client.mjs --apply
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { resolveAccessor } from "./accessor-resolution.mjs";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const DUMP_TAIL = process.argv.includes("--dump-tail");
const SCAN_DIRS = [join(ROOT, "apps/app"), join(ROOT, "apps/api")];
const TAIL_OUT = join(ROOT, "manifest/scripts/prisma-tail-sites.txt");

const ir = JSON.parse(readFileSync(join(ROOT, "manifest/ir/kitchen.ir.json"), "utf8"));
const plural = (s) =>
  /(s|x|z|ch|sh)$/.test(s) ? `${s}es` : /y$/.test(s) ? `${s.slice(0, -1)}ies` : `${s}s`;

const accessorToClient = new Map();
for (const entity of (ir.entities ?? []).map((e) => e.name)) {
  const { accessor, drop } = resolveAccessor(entity);
  if (drop || !accessor) continue;
  accessorToClient.set(accessor, {
    listFn: `list${plural(entity)}`,
    getFn: `get${entity}`,
  });
}

const WRITE_METHODS = new Set([
  "create", "update", "updateMany", "delete", "deleteMany", "upsert", "createMany",
]);
const READ_METHODS = new Set(["findMany", "findUnique", "findFirst"]);
const AGG_METHODS = new Set(["count", "aggregate", "groupBy"]);

const CALL_START =
  /(?:await\s+)?database\.([a-zA-Z0-9_]+)\.(findMany|findUnique|findFirst|count|aggregate|groupBy|create|update|updateMany|delete|deleteMany|upsert|createMany)\s*\(/g;

function walk(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (["node_modules", ".next-dev", "__tests__", ".next"].includes(name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function allFiles() {
  const out = [];
  for (const d of SCAN_DIRS) walk(d, out);
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

function classify(accessor, method, argsText) {
  const map = accessorToClient.get(accessor);
  if (!map) return { bucket: "unknown-accessor", map: null };
  if (WRITE_METHODS.has(method) || AGG_METHODS.has(method)) return { bucket: "tail", map };
  if (!READ_METHODS.has(method)) return { bucket: "tail", map };

  const hasInclude = /\binclude\s*:/.test(argsText);
  if (method === "findMany") {
    if (hasInclude) return { bucket: "skip-include", map };
    return { bucket: "apply-list", map };
  }
  const idMatch = argsText.match(/where\s*:\s*\{\s*id\s*:\s*([^,}\s]+)/);
  if ((method === "findUnique" || method === "findFirst") && idMatch && !hasInclude) {
    return { bucket: "apply-get", map, idExpr: idMatch[1] };
  }
  if (method === "findUnique" || method === "findFirst") {
    return { bucket: "skip-get-complex", map };
  }
  return { bucket: "other", map };
}

function scanFile(file) {
  const text = readFileSync(file, "utf8");
  const hits = [];
  CALL_START.lastIndex = 0;
  let m;
  while ((m = CALL_START.exec(text)) !== null) {
    const accessor = m[1];
    const method = m[2];
    const callStart = m.index;
    const openIdx = m.index + m[0].length - 1;
    const args = sliceBalancedParens(text, openIdx);
    if (!args) continue;
    const prefix = text.slice(Math.max(0, callStart - 7), callStart);
    const hasAwait = /await\s*$/.test(prefix);
    const fullLen = m[0].length + args.length - 1;
    const info = classify(accessor, method, args);
    hits.push({ callStart, fullLen, hasAwait, accessor, method, info });
  }
  return { text, hits };
}

function mergeImports(text, needed) {
  if (needed.size === 0) return text;
  const re = /import\s*\{([^}]+)\}\s*from\s*"@\/app\/lib\/manifest-client\.generated";/g;
  if (re.test(text)) {
    return text.replace(re, (_, names) => {
      const existing = names.split(",").map((s) => s.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...needed])].sort();
      return `import { ${merged.join(", ")} } from "@/app/lib/manifest-client.generated";`;
    });
  }
  const imp = `import { ${[...needed].sort().join(", ")} } from "@/app/lib/manifest-client.generated";\n`;
  return text.replace(/^((?:["']use server["'];\n)?)/, `$1${imp}`);
}

function applyFile(file) {
  let { text, hits } = scanFile(file);
  if (!hits.some((h) => h.info.bucket === "apply-list" || h.info.bucket === "apply-get")) {
    return { changed: false, list: 0, get: 0 };
  }
  const needed = new Set();
  let list = 0, get = 0;
  const applicable = hits
    .filter((h) => h.info.bucket === "apply-list" || h.info.bucket === "apply-get")
    .sort((a, b) => b.callStart - a.callStart);

  for (const h of applicable) {
    const start = h.hasAwait ? h.callStart - 6 : h.callStart;
    const end = h.callStart + h.fullLen;
    if (h.info.bucket === "apply-list") {
      needed.add(h.info.map.listFn);
      const rep = h.hasAwait ? `(await ${h.info.map.listFn}()).data` : `(await ${h.info.map.listFn}()).data`;
      text = text.slice(0, start) + rep + text.slice(end);
      list++;
    } else {
      needed.add(h.info.map.getFn);
      const rep = h.hasAwait
        ? `await ${h.info.map.getFn}(${h.info.idExpr})`
        : `${h.info.map.getFn}(${h.info.idExpr})`;
      text = text.slice(0, start) + rep + text.slice(end);
      get++;
    }
  }
  text = mergeImports(text, needed);
  writeFileSync(file, text);
  return { changed: true, list, get };
}

function report() {
  const allHits = [];
  for (const file of allFiles()) {
    for (const h of scanFile(file).hits) {
      allHits.push({ file: relative(ROOT, file), line: 0, ...h });
    }
  }
  const byBucket = {};
  for (const h of allHits) byBucket[h.info.bucket] = (byBucket[h.info.bucket] ?? 0) + 1;
  console.log("=== database.* → manifest-client.generated ===\n");
  console.log(`Call sites: ${allHits.length}`);
  for (const [b, n] of Object.entries(byBucket).sort((a, c) => c[1] - a[1])) {
    console.log(`  ${String(b).padEnd(20)} ${n}`);
  }
  if (DUMP_TAIL) {
    const lines = allHits
      .filter((h) => ["tail", "unknown-accessor", "skip-include", "skip-get-complex"].includes(h.info.bucket))
      .map((h) => `${h.file}\tdatabase.${h.accessor}.${h.method}\t${h.info.bucket}`);
    writeFileSync(TAIL_OUT, lines.join("\n") + "\n");
    console.log(`\nWrote ${lines.length} lines → ${relative(ROOT, TAIL_OUT)}`);
  }
  return allHits;
}

if (!APPLY) {
  report();
  console.log("\nPass --apply to rewrite.");
  process.exit(0);
}

let totalList = 0, totalGet = 0, totalFiles = 0, pass = 0;
for (;;) {
  pass++;
  let passList = 0, passGet = 0, passFiles = 0;
  for (const file of allFiles()) {
    const r = applyFile(file);
    if (r.changed) {
      passFiles++;
      passList += r.list;
      passGet += r.get;
    }
  }
  totalList += passList;
  totalGet += passGet;
  totalFiles += passFiles;
  console.log(`Pass ${pass}: ${passList} list + ${passGet} get in ${passFiles} files`);
  if (passList + passGet === 0) break;
  if (pass >= 10) break;
}
console.log(`\nTotal: ${totalList} list + ${totalGet} get (${totalFiles} file passes)`);
report();
DUMP_TAIL || process.argv.push("--dump-tail");
