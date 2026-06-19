#!/usr/bin/env node
/**
 * neon-snapshot-branch.mjs
 *
 * Creates a PERSISTENT Neon branch of the production project as a pre-deploy
 * restore point, then exits. Unlike neon-shadow-branch.mjs (ephemeral, used for
 * Prisma's shadow DB), this branch is NOT deleted — it is the backup.
 *
 * A Neon branch is an instant copy-on-write snapshot of the parent branch's data
 * + schema at creation time, so it is a valid restore point regardless of DB size
 * and adds no measurable load. No compute endpoint is created (cheaper); attach
 * one from the console if you need to read/restore from it.
 *
 * Fail-closed: ANY error exits non-zero. In the deploy workflow this step runs
 * BEFORE `prisma migrate deploy`, so a failed snapshot aborts the deploy before
 * production is mutated.
 *
 * Env:
 *   NEON_API_KEY            (required) – Neon API key.
 *   PRODUCTION_DATABASE_URL (recommended) – used to resolve the prod project by
 *                            its endpoint host when more than one project exists.
 *   NEON_PROJECT_ID         (optional) – skip resolution and use this directly.
 *   SNAPSHOT_TAG            (optional) – suffix for the branch name (e.g. run id).
 */

const NEON_API = "https://console.neon.tech/api/v2";

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
    const err = new Error(`Neon ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body ? JSON.parse(body) : null;
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
  // it IS scoped to via `subject_project_id`. Use that — it's the prod project.
  try {
    const { projects } = await api("/projects");
    if (!projects?.length) throw new Error("No Neon projects visible to this API key.");
    if (projects.length === 1) return projects[0].id;
    const wantEndpoint = endpointIdFromUrl(process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL || "");
    if (wantEndpoint) {
      for (const p of projects) {
        const { endpoints } = await api(`/projects/${p.id}/endpoints`);
        if ((endpoints || []).some((e) => e.id === wantEndpoint || (e.host || "").startsWith(wantEndpoint))) {
          return p.id;
        }
      }
    }
    const byName = projects.find((p) => /divine[- ]?math/i.test(p.name || ""));
    if (byName) return byName.id;
    throw new Error(`Multiple projects; set NEON_PROJECT_ID (endpoint '${wantEndpoint ?? "unknown"}').`);
  } catch (e) {
    const m = /subject_project_id:\s*\\?"([^"\\]+)\\?"/.exec(e.body || e.message || "");
    if (m) return m[1];
    throw e;
  }
}

/**
 * Confirm the resolved project actually hosts the production endpoint, so we
 * never snapshot the wrong project. Skips the check if the prod URL is absent.
 */
async function assertIsProdProject(projectId) {
  const wantEndpoint = endpointIdFromUrl(process.env.PRODUCTION_DATABASE_URL || "");
  if (!wantEndpoint) return; // no prod URL to verify against
  const { endpoints } = await api(`/projects/${projectId}/endpoints`);
  const match = (endpoints || []).some((e) => e.id === wantEndpoint || (e.host || "").startsWith(wantEndpoint));
  if (!match) {
    throw new Error(
      `Resolved project ${projectId} does not host the production endpoint '${wantEndpoint}' — ` +
        "refusing to snapshot the wrong project.",
    );
  }
}

async function main() {
  const projectId = await resolveProjectId();
  await assertIsProdProject(projectId);
  const tag = process.env.SNAPSHOT_TAG || `${Date.now()}`;
  const name = `pre-deploy-${tag}`;

  console.error(`Creating persistent Neon snapshot branch '${name}' on project ${projectId} …`);
  const result = await api(`/projects/${projectId}/branches`, {
    method: "POST",
    body: JSON.stringify({ branch: { name } }),
  });

  const id = result?.branch?.id;
  if (!id) throw new Error(`Unexpected Neon response: ${JSON.stringify(result)}`);

  console.error(`✓ Snapshot created: ${name} (${id}) on project ${projectId}`);
  console.error(`  Restore: Neon console → project ${projectId} → Branches → ${name} (attach a compute endpoint to read).`);
}

main().catch((err) => {
  console.error(`✗ Pre-deploy snapshot FAILED — aborting deploy before any DB change: ${err.message}`);
  process.exit(1);
});
