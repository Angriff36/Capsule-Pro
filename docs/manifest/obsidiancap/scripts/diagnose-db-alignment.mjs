#!/usr/bin/env node
/**
 * Diagnose Prisma / DB alignment issues CONCLUSIVELY.
 *
 * What it verifies (no vibes):
 * 1) ENV TARGETS: Collects DATABASE URL candidates from env files + process env
 *    - Includes common Prisma/Next variants (DATABASE_URL, DIRECT_URL, SHADOW_DATABASE_URL, PRISMA_DATABASE_URL, etc.)
 * 2) CODE FACTS: Verifies the claimed query actually:
 *    - has FROM tenant_kitchen.recipe_versions rv (or at least schema-qualified recipe_versions with alias rv)
 *    - references rv.instructions somewhere in the SQL template
 * 3) DB FACTS: Connects using pg and verifies:
 *    - current_database/current_schema/search_path for each target
 *    - the actual relation kind for tenant_kitchen.recipe_versions (table/view/matview/partitioned/foreign)
 *    - whether instructions exists there
 *    - whether ANY other recipe_versions relations exist in other schemas, and whether they lack instructions
 *    - whether unqualified "recipe_versions" would resolve to a different schema under current search_path
 * 4) PRISMA MIGRATE CONTEXT: Runs `npx prisma migrate status` from packages/database
 *
 * Output:
 * - Prints a human report
 * - Writes ./diagnose-db-alignment.report.json
 *
 * Usage:
 *   node scripts/diagnose-db-alignment.mjs
 *   node scripts/diagnose-db-alignment.mjs --code apps/app/app/(authenticated)/events/[eventId]/page.tsx
 *
 * Requirements:
 * - Node 18+
 * - `pg` installed in workspace
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const CWD = process.cwd();

// -------- args --------
function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const DEFAULT_CODE_PATH = path.join(
  CWD,
  "apps",
  "app",
  "app",
  "(authenticated)",
  "events",
  "[eventId]",
  "page.tsx",
);

const CODE_PATH = getArg("--code") ? path.resolve(CWD, getArg("--code")) : DEFAULT_CODE_PATH;

// -------- helpers --------
function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
}

function fileSha1(fp) {
  try {
    const buf = fs.readFileSync(fp);
    return sha1(buf);
  } catch {
    return null;
  }
}

function redactUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "REDACTED";
    if (u.username) u.username = "REDACTED";
    return u.toString();
  } catch {
    return "INVALID_URL";
  }
}

function fingerprintUrl(url) {
  try {
    const u = new URL(url);
    const host = u.host;
    const db = (u.pathname || "").replace(/^\//, "") || "(none)";
    const schema = u.searchParams.get("schema") || u.searchParams.get("schemas") || "";
    const sslmode = u.searchParams.get("sslmode") || "";
    const opts = u.searchParams.get("options") || "";
    const channelBinding = u.searchParams.get("channel_binding") || "";
    return {
      id: sha1(url),
      host,
      db,
      schemaParam: schema,
      sslmode,
      channelBinding,
      optionsParam: opts,
      redacted: redactUrl(url),
    };
  } catch {
    return { id: sha1(url), host: "", db: "", schemaParam: "", sslmode: "", channelBinding: "", optionsParam: "", redacted: "INVALID_URL" };
  }
}

function readEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2] ?? "";
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function findEnvCandidates() {
  const candidates = [
    path.join(CWD, ".env"),
    path.join(CWD, ".env.local"),
    path.join(CWD, ".env.development"),
    path.join(CWD, ".env.production"),

    path.join(CWD, "apps", "app", ".env"),
    path.join(CWD, "apps", "app", ".env.local"),
    path.join(CWD, "apps", "app", ".env.development"),
    path.join(CWD, "apps", "app", ".env.production"),
    path.join(CWD, "apps", "app", ".env.vercel"),
    path.join(CWD, "apps", "app", ".env.vercel.production"),

    path.join(CWD, "packages", "database", ".env"),
    path.join(CWD, "packages", "database", ".env.local"),
    path.join(CWD, "packages", "database", ".env.development"),
    path.join(CWD, "packages", "database", ".env.production"),
  ];

  const extra = [];
  try {
    for (const d of ["apps/app", "packages/database"]) {
      const dir = path.join(CWD, d);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.startsWith(".env")) continue;
        extra.push(path.join(dir, f));
      }
    }
  } catch {
    // ignore
  }

  return [...new Set([...candidates, ...extra])].filter((p) => fs.existsSync(p));
}

function uniq(arr) {
  return [...new Set(arr)];
}

function runCmd(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
    cmd: [cmd, ...args].join(" "),
  };
}

// -------- CODE verification --------
function extractSqlTemplateFacts(codeText) {
  // We are not building a TS parser. We’re proving the specific assumptions.
  // Facts to prove:
  // - there's an SQL template containing "FROM tenant_kitchen.recipe_versions rv"
  // - there's "rv.instructions" referenced
  const lines = codeText.split(/\r?\n/);

  const fromHits = [];
  const instrHits = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/FROM\s+tenant_kitchen\.recipe_versions\s+rv\b/i.test(l)) {
      fromHits.push({ line: i + 1, text: l.trim() });
    }
    if (/\brv\.instructions\b/i.test(l)) {
      instrHits.push({ line: i + 1, text: l.trim() });
    }
  }

  // Also detect schema-qualified recipe_versions with alias rv (covers formatting differences)
  const fromQualifiedAny = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/FROM\s+[A-Za-z_][A-Za-z0-9_]*\.recipe_versions\s+rv\b/i.test(l)) {
      fromQualifiedAny.push({ line: i + 1, text: l.trim() });
    }
  }

  return {
    fromTenantKitchenRv: fromHits,
    fromAnySchemaRv: fromQualifiedAny,
    rvInstructions: instrHits,
  };
}

function probeCodeFacts(codePath) {
  const facts = {
    codePath,
    exists: fs.existsSync(codePath),
    sha1: null,
    fromClauseVerified: false,
    rvInstructionsVerified: false,
    hits: null,
    warning: null,
  };

  if (!facts.exists) {
    facts.warning = "Code file not found at the provided path. Cannot verify FROM clause or rv.instructions reference.";
    return facts;
  }

  facts.sha1 = fileSha1(codePath);

  const text = fs.readFileSync(codePath, "utf8");
  const hits = extractSqlTemplateFacts(text);
  facts.hits = hits;

  // Verified if we saw exact tenant_kitchen FROM, or at least schema-qualified FROM
  const hasFrom = hits.fromTenantKitchenRv.length > 0 || hits.fromAnySchemaRv.length > 0;
  const hasInstr = hits.rvInstructions.length > 0;

  facts.fromClauseVerified = hasFrom;
  facts.rvInstructionsVerified = hasInstr;

  if (!hasFrom || !hasInstr) {
    facts.warning =
      "Code assumptions not fully verified. Either FROM ... recipe_versions rv was not found as schema-qualified, or rv.instructions reference was not found. The runtime error may be coming from different SQL than you believe.";
  }

  return facts;
}

// -------- DB checks via pg --------
async function loadPg() {
  try {
    const mod = await import("pg");
    return mod;
  } catch {
    return null;
  }
}

async function probeDb(url) {
  const pg = await loadPg();
  if (!pg) {
    return {
      ok: false,
      error: "Missing dependency: pg. Install with: pnpm add -D pg -w",
      facts: null,
    };
  }
  const { Client } = pg;

  const client = new Client({ connectionString: url });
  const facts = {
    connection: fingerprintUrl(url),
    server: {},
    checks: {},
    objects: {},
  };

  try {
    await client.connect();

    // Identity + search_path
    const idRes = await client.query(`
      SELECT
        current_database() AS db,
        current_user AS usr,
        current_schema() AS schema,
        inet_server_addr()::text AS server_addr,
        inet_server_port() AS server_port,
        version() AS version
    `);
    facts.server = idRes.rows?.[0] ?? {};

    const sp = await client.query(`SHOW search_path`);
    facts.server.search_path = sp.rows?.[0]?.search_path ?? null;

    // Does tenant_kitchen.recipe_versions exist (as a relation)?
    // Determine relation kind: r=table, v=view, m=matview, p=partitioned table, f=foreign table
    const relRes = await client.query(`
      SELECT
        n.nspname AS schema,
        c.relname AS name,
        c.relkind AS relkind,
        pg_catalog.pg_get_userbyid(c.relowner) AS owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'tenant_kitchen'
        AND c.relname = 'recipe_versions'
      LIMIT 5
    `);
    facts.objects.tenant_kitchen_recipe_versions = relRes.rows ?? [];

    // Column existence: tenant_kitchen.recipe_versions.instructions (information_schema)
    const colRes = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'tenant_kitchen'
          AND table_name = 'recipe_versions'
          AND column_name = 'instructions'
      ) AS exists
    `);
    facts.checks.instructions_exists = Boolean(colRes.rows?.[0]?.exists);

    // Raw pg_catalog column existence check too (harder to “lie” than information_schema)
    const colRes2 = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'tenant_kitchen'
          AND c.relname = 'recipe_versions'
          AND a.attname = 'instructions'
          AND a.attisdropped = false
          AND a.attnum > 0
      ) AS exists
    `);
    facts.checks.instructions_exists_pg_catalog = Boolean(colRes2.rows?.[0]?.exists);

    // Does the table exist where you think it does? (information_schema.tables)
    const tblRes = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'tenant_kitchen'
          AND table_name = 'recipe_versions'
      ) AS exists
    `);
    facts.checks.recipe_versions_table_exists = Boolean(tblRes.rows?.[0]?.exists);

    // Find any recipe_versions across schemas + their relkind
    const allRel = await client.query(`
      SELECT
        n.nspname AS schema,
        c.relname AS name,
        c.relkind AS relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'recipe_versions'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname
    `);
    facts.checks.recipe_versions_relations = allRel.rows ?? [];

    // For each schema where recipe_versions exists, does it have instructions?
    const allInstr = await client.query(`
      SELECT
        n.nspname AS schema,
        c.relname AS name,
        EXISTS (
          SELECT 1
          FROM pg_attribute a
          WHERE a.attrelid = c.oid
            AND a.attname = 'instructions'
            AND a.attisdropped = false
            AND a.attnum > 0
        ) AS has_instructions
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'recipe_versions'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname
    `);
    facts.checks.recipe_versions_instructions_matrix = allInstr.rows ?? [];

    // Determine where an unqualified "recipe_versions" would resolve given current search_path
    // This answers: "could search_path explain it?"
    const unq = await client.query(`
      SELECT to_regclass('recipe_versions')::text AS resolved
    `);
    facts.checks.unqualified_recipe_versions_resolves_to = unq.rows?.[0]?.resolved ?? null;

    // Privilege check (if runtime user differs, privilege could alter what you can query; not likely for 42703, but verify)
    const priv = await client.query(`
      SELECT
        has_table_privilege(current_user, 'tenant_kitchen.recipe_versions', 'SELECT') AS can_select
    `);
    facts.checks.can_select_tenant_kitchen_recipe_versions = Boolean(priv.rows?.[0]?.can_select);

    return { ok: true, error: null, facts };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), facts };
  } finally {
    try { await client.end(); } catch {}
  }
}

// -------- Main --------
(async function main() {
  const startedAt = new Date().toISOString();

  // 0) Verify code assumptions
  const codeFacts = probeCodeFacts(CODE_PATH);

  // 1) Collect URL candidates
  const envFiles = findEnvCandidates();
  const envHits = [];

  // Expand env keys beyond just DATABASE_URL/DIRECT_URL.
  // This verifies the assumption “we’re not missing the real runtime env var name.”
  const ENV_KEYS = [
    "DATABASE_URL",
    "DIRECT_URL",
    "SHADOW_DATABASE_URL",
    "PRISMA_DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PRISMA_URL",
    "VERCEL_POSTGRES_URL",
  ];

  for (const f of envFiles) {
    const parsed = readEnvFile(f);
    for (const k of ENV_KEYS) {
      if (parsed[k]) envHits.push({ source: f, key: k, value: parsed[k] });
    }
  }

  // Also include process env
  for (const k of ENV_KEYS) {
    if (process.env[k]) envHits.push({ source: "process.env", key: k, value: process.env[k] });
  }

  // Normalize + de-dupe values
  const urls = uniq(envHits.map((h) => h.value).filter(Boolean));

  const urlIndex = urls.map((u) => ({
    url: u,
    fp: fingerprintUrl(u),
    sources: envHits.filter((h) => h.value === u).map((h) => ({ source: h.source, key: h.key })),
  }));

  // 2) Probe each DB URL
  const probes = [];
  for (const entry of urlIndex) {
    // eslint-disable-next-line no-await-in-loop
    const probe = await probeDb(entry.url);
    probes.push({ ...entry, probe });
  }

  // 3) Prisma migrate status (repo truth)
  // Prisma CLI reference documents migrate status. https://www.prisma.io/docs/orm/reference/prisma-cli-reference
  const prismaDir = path.join(CWD, "packages", "database");
  let migrateStatus = null;
  if (fs.existsSync(prismaDir)) {
    migrateStatus = runCmd("npx", ["prisma", "migrate", "status"], { cwd: prismaDir });
  } else {
    migrateStatus = { ok: false, status: 1, stdout: "", stderr: "packages/database not found", cmd: "" };
  }

  // 4) Build facts summary
  const factsSummary = [];
  for (const p of probes) {
    const serverDb = p.probe?.facts?.server?.db ?? "(unknown)";
    const serverSchema = p.probe?.facts?.server?.schema ?? "(unknown)";
    const searchPath = p.probe?.facts?.server?.search_path ?? "(unknown)";
    const ie = p.probe?.facts?.checks?.instructions_exists;
    factsSummary.push({
      id: p.fp.id,
      redacted: p.fp.redacted,
      sources: p.sources,
      probe_ok: p.probe.ok,
      server_db: serverDb,
      server_schema: serverSchema,
      search_path: searchPath,
      tenant_kitchen_recipe_versions_relation: p.probe?.facts?.objects?.tenant_kitchen_recipe_versions ?? null,
      recipe_versions_table_exists: p.probe?.facts?.checks?.recipe_versions_table_exists ?? null,
      instructions_exists_information_schema: typeof ie === "boolean" ? ie : null,
      instructions_exists_pg_catalog: p.probe?.facts?.checks?.instructions_exists_pg_catalog ?? null,
      all_recipe_versions_relations: p.probe?.facts?.checks?.recipe_versions_relations ?? null,
      recipe_versions_instructions_matrix: p.probe?.facts?.checks?.recipe_versions_instructions_matrix ?? null,
      unqualified_resolves_to: p.probe?.facts?.checks?.unqualified_recipe_versions_resolves_to ?? null,
      can_select: p.probe?.facts?.checks?.can_select_tenant_kitchen_recipe_versions ?? null,
      error: p.probe.ok ? null : p.probe.error,
    });
  }

  // 5) Conclusive verdict rules (stronger, fewer assumptions)
  const conclusions = [];

  const reachable = probes.filter((p) => p.probe.ok);
  const withInstr = reachable.filter((p) => p.probe.facts?.checks?.instructions_exists === true);
  const withoutInstr = reachable.filter((p) => p.probe.facts?.checks?.instructions_exists === false);

  // Do any schemas contain recipe_versions without instructions? (could explain 42703 if query was NOT schema-qualified)
  const anyAltMissingInstr = [];
  for (const p of reachable) {
    const matrix = p.probe.facts?.checks?.recipe_versions_instructions_matrix ?? [];
    for (const row of matrix) {
      if (row && row.schema && row.has_instructions === false) {
        anyAltMissingInstr.push({ urlId: p.fp.id, schema: row.schema });
      }
    }
  }

  // Verify code assumptions
  if (!codeFacts.exists) {
    conclusions.push({
      verdict: "INCONCLUSIVE: CODE NOT VERIFIED",
      reason: "The provided code file path was not found, so FROM/alias assumptions cannot be verified.",
      action: "Rerun with: --code <path to the page.tsx containing the query>.",
    });
  } else if (!codeFacts.fromClauseVerified || !codeFacts.rvInstructionsVerified) {
    conclusions.push({
      verdict: "CONCLUSIVE: CODE ASSUMPTIONS FAIL",
      reason: "The script could not verify BOTH (a) schema-qualified FROM ... recipe_versions rv and (b) rv.instructions in the same file. The runtime error may not be coming from the SQL you think.",
      action: "Open the runtime stack trace line and confirm the exact Prisma.sql template being executed matches the intended query.",
    });
  }

  if (probes.length === 0) {
    conclusions.push({
      verdict: "INCONCLUSIVE: NO URLS",
      reason: "No DB URL candidates found in scanned env files or process env.",
      action: "Expose DATABASE_URL (or equivalent) to env files and rerun.",
    });
  } else if (reachable.length === 0) {
    conclusions.push({
      verdict: "INCONCLUSIVE: NO REACHABLE DBS",
      reason: "Could not connect to any discovered DB URL candidates.",
      action: "Fix connectivity/credentials and rerun. (If pg missing, install it.)",
    });
  } else if (withInstr.length > 0 && withoutInstr.length > 0) {
    conclusions.push({
      verdict: "CONCLUSIVE: MULTIPLE DB TARGETS / BRANCHES",
      reason: "Among reachable DB URLs, at least one has tenant_kitchen.recipe_versions.instructions and at least one does not. Your runtime vs CLI can easily be hitting different DBs.",
      action: "Unify runtime and CLI DATABASE_URL to one target, then rerun.",
    });
  } else if (withInstr.length > 0 && withoutInstr.length === 0) {
    // Column exists on all reachable targets.
    // If runtime still errors 42703, only two explanations remain:
    // - runtime is using a DB URL that isn't in your env files (missing env injection), OR
    // - the SQL executed is not the FROM clause you believe (different code path/build)
    const altWarn = anyAltMissingInstr.length > 0
      ? "Also: other schemas contain recipe_versions without instructions, but that only matters if your query is unqualified (your verified query is schema-qualified, so search_path should not explain 42703)."
      : "No alternate schema recipe_versions missing instructions were detected on reachable targets.";

    conclusions.push({
      verdict: "CONCLUSIVE: COLUMN EXISTS ON ALL REACHABLE TARGETS",
      reason: `Every reachable configured DB target has tenant_kitchen.recipe_versions.instructions. If runtime still throws 42703, runtime is connecting to a different DB URL than what is discoverable here, OR a different SQL/template is executing than the verified file. ${altWarn}`,
      action: "Add a one-time runtime $queryRaw probe (current_database/current_schema/search_path + column EXISTS) and log it, then remove it. This will prove whether runtime DB differs.",
    });
  } else if (withInstr.length === 0 && withoutInstr.length > 0) {
    conclusions.push({
      verdict: "CONCLUSIVE: COLUMN MISSING ON ALL REACHABLE TARGETS",
      reason: "None of the reachable DB targets have tenant_kitchen.recipe_versions.instructions. Runtime 42703 is expected until a migration adds it.",
      action: "Add field to schema.prisma and create/apply a migration.",
    });
  }

  // 6) Report
  const report = {
    startedAt,
    cwd: CWD,
    codeFacts,
    envFilesScanned: envFiles,
    envKeysScanned: ENV_KEYS,
    urlsFound: urlIndex.map((u) => ({ fp: u.fp, sources: u.sources })),
    dbFacts: factsSummary,
    prismaMigrateStatus: migrateStatus,
    conclusions,
    references: {
      prisma_cli_reference: "https://www.prisma.io/docs/orm/reference/prisma-cli-reference",
      prisma_raw_queries: "https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries",
      postgres_to_regclass: "https://www.postgresql.org/docs/current/functions-info.html",
    },
  };

  const outPath = path.join(CWD, "diagnose-db-alignment.report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  // -------- Human-readable output --------
  console.log("\n=== DB ALIGNMENT DIAGNOSTIC REPORT (HARD VERIFY) ===\n");
  console.log("Report file:", outPath);

  console.log("\nCODE VERIFICATION:");
  console.log(`- codePath: ${codeFacts.codePath}`);
  console.log(`- exists: ${codeFacts.exists}`);
  if (codeFacts.sha1) console.log(`- sha1: ${codeFacts.sha1}`);
  console.log(`- fromClauseVerified: ${codeFacts.fromClauseVerified}`);
  console.log(`- rvInstructionsVerified: ${codeFacts.rvInstructionsVerified}`);
  if (codeFacts.hits) {
    if (codeFacts.hits.fromTenantKitchenRv.length) {
      console.log("  FROM tenant_kitchen.recipe_versions rv hits:");
      for (const h of codeFacts.hits.fromTenantKitchenRv) console.log(`    L${h.line}: ${h.text}`);
    } else if (codeFacts.hits.fromAnySchemaRv.length) {
      console.log("  FROM <schema>.recipe_versions rv hits:");
      for (const h of codeFacts.hits.fromAnySchemaRv) console.log(`    L${h.line}: ${h.text}`);
    } else {
      console.log("  No schema-qualified FROM ... recipe_versions rv hits found.");
    }
    if (codeFacts.hits.rvInstructions.length) {
      console.log("  rv.instructions hits:");
      for (const h of codeFacts.hits.rvInstructions) console.log(`    L${h.line}: ${h.text}`);
    } else {
      console.log("  No rv.instructions hits found.");
    }
  }
  if (codeFacts.warning) console.log(`- warning: ${codeFacts.warning}`);

  console.log("\nDiscovered DB URL candidates (redacted):");
  for (const u of urlIndex) {
    console.log(`- [${u.fp.id}] ${u.fp.redacted}`);
    for (const s of u.sources) console.log(`    source: ${s.source} (${s.key})`);
  }

  console.log("\nDB probes:");
  for (const f of factsSummary) {
    console.log(`- [${f.id}] ok=${f.probe_ok} db=${f.server_db} schema=${f.server_schema}`);
    console.log(`    search_path=${f.search_path}`);
    console.log(`    tenant_kitchen.recipe_versions exists=${f.recipe_versions_table_exists} instructions(info_schema)=${f.instructions_exists_information_schema} instructions(pg_catalog)=${f.instructions_exists_pg_catalog}`);
    console.log(`    unqualified recipe_versions resolves to: ${f.unqualified_resolves_to}`);
    if (Array.isArray(f.tenant_kitchen_recipe_versions_relation) && f.tenant_kitchen_recipe_versions_relation.length) {
      console.log("    tenant_kitchen.recipe_versions relkind(s):");
      for (const r of f.tenant_kitchen_recipe_versions_relation) {
        console.log(`      schema=${r.schema} name=${r.name} relkind=${r.relkind} owner=${r.owner}`);
      }
    }
    if (Array.isArray(f.recipe_versions_instructions_matrix) && f.recipe_versions_instructions_matrix.length) {
      const missing = f.recipe_versions_instructions_matrix.filter((r) => r.has_instructions === false).map((r) => r.schema);
      if (missing.length) console.log(`    WARNING: recipe_versions exists without instructions in schema(s): ${missing.join(", ")}`);
    }
    if (!f.probe_ok) console.log(`    error=${f.error}`);
  }

  console.log("\nPrisma migrate status (packages/database):");
  console.log(`cmd: ${migrateStatus.cmd}`);
  if (migrateStatus.stdout) console.log(migrateStatus.stdout);
  if (migrateStatus.stderr) console.log(migrateStatus.stderr);

  console.log("\nFINAL VERDICT:");
  for (const c of conclusions) {
    console.log(`- ${c.verdict}`);
    console.log(`  reason: ${c.reason}`);
    console.log(`  action: ${c.action}`);
  }

  const conclusive = conclusions.some((c) => String(c.verdict).startsWith("CONCLUSIVE"));
  process.exit(conclusive ? 0 : 2);
})().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
