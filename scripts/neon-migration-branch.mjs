#!/usr/bin/env node
/**
 * neon-migration-branch.mjs
 *
 * Manages an EPHEMERAL Neon branch used by the migration-preview CI gate to
 * run `prisma migrate dev --create-only` against a throwaway, fully-migrated
 * copy of the canonical branch. Unlike neon-snapshot-branch.mjs (a PERSISTENT
 * pre-deploy restore point that is never deleted), this branch is created at
 * the start of the CI job and deleted at the end — always, even on failure.
 *
 * A Neon branch is an instant copy-on-write snapshot of the parent branch's
 * schema + data at creation time, so the ephemeral branch already carries the
 * full migration history (`_prisma_migrations`) and the live table layout.
 * That lets `prisma migrate dev --create-only` diff the committed schema.prisma
 * against the migrated state and generate a candidate migration WITHOUT
 * touching the real dev/staging/prod branch.
 *
 * SUBCOMMANDS
 *   create   Create an ephemeral branch (with a read_write compute endpoint)
 *            and a separate empty `shadow` database on it. Emits, to
 *            $GITHUB_OUTPUT (and stdout as `key=value` lines when GITHUB_OUTPUT
 *            is unset), the connection strings the Prisma step should use:
 *              neon-branch-id=<id>
 *              branch-database-url=<direct conn string to the migrated copy>
 *              branch-shadow-database-url=<direct conn string to empty shadow db>
 *
 *   delete   Delete the branch recorded in NEON_BRANCH_ID. Cascades to the
 *            compute endpoint + databases. Idempotent: exits 0 if the branch
 *            is already gone (so the always-run cleanup step never fails the
 *            job on a branch that failed to create).
 *
 * ENV
 *   NEON_API_KEY          (required) — Neon API key.
 *   NEON_DATABASE_URL     (required for create) — a connection string of the
 *                         branch to copy FROM. Provides project resolution
 *                         (host→project), the DB name to clone, and the role +
 *                         password reused on the new branch. Point this at the
 *                         dev/staging branch — NOT production.
 *   NEON_PARENT_BRANCH_ID (optional) — branch to snapshot; defaults to the
 *                         project's primary branch.
 *   NEON_SHADOW_DB_NAME   (optional) — name of the empty shadow database to
 *                         create (default: "shadow").
 *   BRANCH_TAG            (optional) — suffix for the branch name (e.g. run id).
 *   NEON_BRANCH_ID        (required for delete) — branch id to remove.
 *
 * Fail-closed: ANY unexpected error exits non-zero so the CI gate surfaces it.
 * The workflow wraps `delete` in an `if: always()` step with `continue-on-error`.
 */

import { appendFileSync } from "node:fs";

const NEON_API = "https://console.neon.tech/api/v2";
const DEFAULT_SHADOW_DB_NAME = "shadow";

function reqEnv(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return v;
}

async function api(path, options = {}) {
  const res = await fetch(`${NEON_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${reqEnv("NEON_API_KEY")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const body = res.status === 204 ? null : await res.text();
  if (!res.ok) {
    const err = new Error(
      `Neon ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`,
    );
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body ? JSON.parse(body) : null;
}

/** Parse a postgres connection string into its parts. */
function parseConnUrl(raw) {
  try {
    const u = new URL(raw);
    const [, password] = u.username ? [u.username, decodeURIComponent(u.password || "")] : [];
    return {
      user: decodeURIComponent(u.username || ""),
      password: decodeURIComponent(u.password || ""),
      host: u.host,
      hostname: u.hostname,
      port: u.port || "5432",
      dbName: (u.pathname || "").replace(/^\//, ""),
      search: u.search || "",
    };
  } catch {
    return null;
  }
}

/** Build a direct (non-pooled) postgres URL from parts. */
function buildConnUrl({ user, password, host, dbName, sslmode }) {
  const auth = `${user}:${encodeURIComponent(password)}`;
  const params = sslmode ? `?sslmode=${sslmode}` : "";
  return `postgresql://${auth}@${host}/${dbName}${params}`;
}

/** ep-divine-math-xxxx-pooler.<region>.aws.neon.tech → ep-divine-math-xxxx */
function endpointIdFromUrl(url) {
  try {
    const host = new URL(url).host;
    return host.split(".")[0].replace(/-pooler$/, "");
  } catch {
    return null;
  }
}

async function resolveProjectId() {
  if (process.env.NEON_PROJECT_ID) return process.env.NEON_PROJECT_ID;

  // A project-scoped API key cannot list projects; it answers with the project
  // it IS scoped to via `subject_project_id`. Use that — mirrors
  // neon-snapshot-branch.mjs.
  try {
    const { projects } = await api("/projects");
    if (!projects?.length)
      throw new Error("No Neon projects visible to this API key.");
    if (projects.length === 1) return projects[0].id;
    const wantEndpoint = endpointIdFromUrl(
      process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "",
    );
    if (wantEndpoint) {
      for (const p of projects) {
        const { endpoints } = await api(`/projects/${p.id}/endpoints`);
        if (
          (endpoints || []).some(
            (e) =>
              e.id === wantEndpoint ||
              (e.host || "").startsWith(wantEndpoint),
          )
        ) {
          return p.id;
        }
      }
    }
    throw new Error(
      `Multiple projects; set NEON_PROJECT_ID (endpoint '${wantEndpoint ?? "unknown"}').`,
    );
  } catch (e) {
    const m = /subject_project_id:\s*\\?"([^"\\]+)\\?"/.exec(
      e.body || e.message || "",
    );
    if (m) return m[1];
    throw e;
  }
}

async function resolveParentBranchId(projectId) {
  if (process.env.NEON_PARENT_BRANCH_ID)
    return process.env.NEON_PARENT_BRANCH_ID;
  const { branches } = await api(`/projects/${projectId}/branches`);
  const primary = (branches || []).find((b) => b.primary);
  if (!primary) {
    throw new Error(
      `Project ${projectId} has no primary branch; set NEON_PARENT_BRANCH_ID.`,
    );
  }
  return primary.id;
}

/**
 * Emit a key=value line: write to $GITHUB_OUTPUT when available (so the
 * workflow step output is reusable), and always echo to stdout so non-Actions
 * callers (local, other CI) can parse it.
 */
function writeOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
  console.log(`${key}=${value}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll the branch's read_write endpoint until it reports `active`. */
async function waitForEndpoint(projectId, endpointId, { timeoutMs = 90_000 } = {}) {
  const start = Date.now();
  let last = "unknown";
  while (Date.now() - start < timeoutMs) {
    const { endpoint } = await api(
      `/projects/${projectId}/endpoints/${endpointId}`,
    );
    last = endpoint?.status || last;
    if (endpoint?.status === "active") return endpoint;
    await sleep(3_000);
  }
  throw new Error(
    `Compute endpoint ${endpointId} did not become active within ${timeoutMs}ms (last status: ${last}).`,
  );
}

async function createBranch() {
  const parentUrl = reqEnv("NEON_DATABASE_URL");
  const parent = parseConnUrl(parentUrl);
  if (!parent || !parent.password) {
    console.error(
      "NEON_DATABASE_URL must include credentials (role + password) so the ephemeral branch can reuse them.",
    );
    process.exit(1);
  }

  const projectId = await resolveProjectId();
  const parentId = await resolveParentBranchId(projectId);
  const tag = process.env.BRANCH_TAG || `${Date.now()}`;
  const name = `migration-preview-${tag}`;
  const shadowDbName = process.env.NEON_SHADOW_DB_NAME || DEFAULT_SHADOW_DB_NAME;
  const sslmode =
    new URL(parentUrl).searchParams.get("sslmode") || "require";

  console.error(
    `Creating ephemeral Neon branch '${name}' (project ${projectId}, parent ${parentId}) …`,
  );
  const created = await api(`/projects/${projectId}/branches`, {
    method: "POST",
    body: JSON.stringify({
      branch: { name, parent_id: parentId },
      endpoints: [{ type: "read_write" }],
    }),
  });

  const branchId = created?.branch?.id;
  const endpoint = (created?.endpoints || [])[0];
  if (!branchId || !endpoint?.host) {
    throw new Error(`Unexpected Neon create-branch response: ${JSON.stringify(created)}`);
  }

  // Compute endpoints start suspended on cold branches; wait for active so the
  // shadow-database create + Prisma connections don't race a cold start.
  console.error(`Waiting for compute endpoint ${endpoint.id} to become active …`);
  await waitForEndpoint(projectId, endpoint.id);

  // Create the empty shadow database Prisma resets to compute the migration diff.
  console.error(`Creating shadow database '${shadowDbName}' on branch ${branchId} …`);
  await api(`/projects/${projectId}/databases`, {
    method: "POST",
    body: JSON.stringify({
      database: { name: shadowDbName, branch_id: branchId, owner_name: parent.user },
    }),
  });

  // Direct (non-pooled) host for Prisma migrate, which needs a non-pooled link.
  const directHost = (endpoint.host || "").replace(/-pooler\./, ".");
  const branchDbUrl = buildConnUrl({
    user: parent.user,
    password: parent.password,
    host: directHost,
    dbName: parent.dbName,
    sslmode,
  });
  const shadowDbUrl = buildConnUrl({
    user: parent.user,
    password: parent.password,
    host: directHost,
    dbName: shadowDbName,
    sslmode,
  });

  console.error(`✓ Ephemeral branch ready: ${name} (${branchId})`);
  writeOutput("neon-branch-id", branchId);
  writeOutput("neon-branch-name", name);
  writeOutput("branch-database-url", branchDbUrl);
  writeOutput("branch-shadow-database-url", shadowDbUrl);
}

async function deleteBranch() {
  const branchId = reqEnv("NEON_BRANCH_ID");
  const projectId = await resolveProjectId();
  try {
    await api(`/projects/${projectId}/branches/${branchId}`, {
      method: "DELETE",
    });
    console.error(`✓ Deleted ephemeral Neon branch ${branchId}.`);
  } catch (e) {
    // 404 = already gone (create never completed, or duplicate cleanup). Not a failure.
    if (e.status === 404) {
      console.error(`✓ Branch ${branchId} already absent — nothing to delete.`);
      return;
    }
    throw e;
  }
}

const subcommand = process.argv[2];

if (subcommand === "create") {
  createBranch().catch((err) => {
    console.error(`✗ Failed to create ephemeral Neon branch: ${err.message}`);
    process.exit(1);
  });
} else if (subcommand === "delete") {
  deleteBranch().catch((err) => {
    console.error(`✗ Failed to delete ephemeral Neon branch: ${err.message}`);
    process.exit(1);
  });
} else {
  console.error("Usage: node scripts/neon-migration-branch.mjs <create|delete>");
  process.exit(2);
}
