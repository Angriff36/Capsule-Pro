#!/usr/bin/env node
/**
 * Vercel Build Autopsy
 *
 * What it does:
 * - Lists recent deployments for a Vercel project
 * - Finds failures
 * - Pulls build logs (deployment events)
 * - Extracts the first real error and prints context
 *
 * Docs used:
 * - List deployments: GET /v6/deployments  (projectId, teamId, limit, target, state, etc.)
 *   https://docs.vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments
 * - Get deployment: GET /v13/deployments/{idOrUrl}
 *   https://vercel.com/docs/rest-api/reference/endpoints/deployments/get-a-deployment-by-id-or-url
 * - Get deployment events (build logs): GET /v3/deployments/{idOrUrl}/events (name=buildId, limit=-1)
 *   https://docs.vercel.com/docs/rest-api/reference/endpoints/deployments/get-deployment-events
 *
 * Auth:
 * - Authorization: Bearer <token>
 *   https://vercel.com/docs/rest-api/reference/welcome
 */

const API = "https://api.vercel.com";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    process.exit(2);
  }
  return v;
}

function optEnv(name) {
  return process.env[name] || "";
}

function qs(params) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  return u.toString();
}

async function vercelFetch(path, { token, method = "GET" } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Vercel API ${method} ${path} failed: ${res.status} ${res.statusText}\n${txt}`);
  }
  return res.json();
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function coerceArray(x) {
  return Array.isArray(x) ? x : [];
}

function stripAnsi(s) {
  // very small ANSI stripper for logs
  return String(s).replace(/\u001b\[[0-9;]*m/g, "");
}

function findFirstErrorLineIndex(lines) {
  const needles = [
    "TypeError:",
    "ReferenceError:",
    "SyntaxError:",
    "Error:",
    "ERR_",
    "Next.js build worker exited with code",
    "ELIFECYCLE",
    "Command failed with exit code",
    "Failed:",
    "Build failed",
  ];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (!L) continue;
    for (const n of needles) {
      if (L.includes(n)) return i;
    }
  }
  return -1;
}

function formatContext(lines, idx, radius = 18) {
  const start = Math.max(0, idx - radius);
  const end = Math.min(lines.length, idx + radius + 1);
  const out = [];
  for (let i = start; i < end; i++) {
    const prefix = i === idx ? ">>> " : "    ";
    out.push(prefix + lines[i]);
  }
  return out.join("\n");
}

function summarizeDeployment(d) {
  const meta = d.meta || {};
  const gitRef =
    pick(meta, [
      "githubCommitRef",
      "gitBranch",
      "gitRef",
      "commitRef",
      "githubRef",
      "ref",
    ]) || "(unknown-ref)";

  const sha =
    pick(meta, [
      "githubCommitSha",
      "gitCommitSha",
      "commitSha",
      "sha",
    ]) || "(unknown-sha)";

  const pr =
    pick(meta, ["githubPullRequestId", "pullRequestId", "pr"]) || "";

  const creator = d.creator?.username || d.creator?.githubLogin || d.creator?.email || "(unknown-creator)";
  const state = d.readyState || d.state || "(unknown-state)";
  const target = d.target || "(unknown-target)";

  return { gitRef, sha, pr, creator, state, target };
}

async function getBuildIdsFromDeploymentDetail(token, deploymentIdOrUrl, teamIdOrSlug) {
  const params = teamIdOrSlug ? `?${qs(teamIdOrSlug)}` : "";
  const detail = await vercelFetch(`/v13/deployments/${encodeURIComponent(deploymentIdOrUrl)}${params}`, { token });

  // Vercel deploy object shapes can vary; we try common places.
  // If "builds" is present, it may be an array of build objects.
  // Otherwise, some objects include build IDs in "buildingAt"/"inspectorUrl" but not directly.
  const builds = coerceArray(detail.builds);

  const buildIds = [];
  for (const b of builds) {
    const id = pick(b, ["id", "uid", "name"]);
    if (id) buildIds.push(id);
  }

  // Fallback: sometimes detail has a single build identifier-like field.
  const single = pick(detail, ["buildId", "build", "name"]);
  if (buildIds.length === 0 && single && typeof single === "string" && single.startsWith("bld_")) {
    buildIds.push(single);
  }

  return { detail, buildIds };
}

async function fetchAllBuildLogLines(token, deploymentIdOrUrl, buildId, teamIdOrSlug) {
  const params = {
    name: buildId,      // "Deployment build ID" per docs
    limit: -1,          // return all available logs
    builds: 1,
    delimiter: 0,
    ...teamIdOrSlug,
  };

  const events = await vercelFetch(
    `/v3/deployments/${encodeURIComponent(deploymentIdOrUrl)}/events?${qs(params)}`,
    { token }
  );

  // Events are an array. Each event has payload.text for log line content.
  const lines = [];
  for (const ev of coerceArray(events)) {
    const text = ev?.payload?.text;
    if (typeof text === "string" && text.trim() !== "") {
      lines.push(stripAnsi(text));
    }
  }
  return lines;
}

async function main() {
  const token = mustEnv("VERCEL_TOKEN");
  const projectId = mustEnv("VERCEL_PROJECT_ID");

  // teamId OR slug optional; docs support both on list deployments/events endpoints
  // https://docs.vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments
  const teamId = optEnv("VERCEL_TEAM_ID");
  const slug = optEnv("VERCEL_TEAM_SLUG");

  const teamParams = teamId ? { teamId } : (slug ? { slug } : {});
  const limit = Number(process.env.VERCEL_LIMIT || "20");

  const list = await vercelFetch(
    `/v6/deployments?${qs({ projectId, limit, ...teamParams })}`,
    { token }
  );

  const deployments = coerceArray(list.deployments);

  console.log(`\n=== Recent Deployments (limit=${limit}) ===`);
  console.log(`ProjectId: ${projectId}`);
  if (teamId) console.log(`TeamId: ${teamId}`);
  if (slug) console.log(`TeamSlug: ${slug}`);

  const rows = deployments.map((d) => {
    const s = summarizeDeployment(d);
    return {
      id: d.uid,
      url: d.url || "",
      created: d.created,
      ...s,
    };
  });

  // Print a compact table
  for (const r of rows) {
    const when = r.created ? new Date(r.created).toISOString() : "(no-time)";
    const url = r.url ? `https://${r.url}` : "(no-url)";
    console.log(
      `- ${r.state.padEnd(10)} ${when}  ${r.creator.padEnd(18)}  ${String(r.gitRef).padEnd(28)}  ${String(r.sha).slice(0, 10)}  ${url}  (${r.id})`
    );
  }

  const failed = deployments.filter((d) => {
    const rs = d.readyState || d.state || "";
    return rs && rs !== "READY";
  });

  console.log(`\n=== Failures Found: ${failed.length} ===`);

  for (const d of failed) {
    const s = summarizeDeployment(d);
    const url = d.url ? `https://${d.url}` : "(no-url)";
    const id = d.uid;

    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`FAIL: ${id}  ${url}`);
    console.log(`Ref: ${s.gitRef}  SHA: ${s.sha}  Creator: ${s.creator}  Target: ${s.target}  State: ${s.state}`);

    // 1) Get build ids
    const { buildIds } = await getBuildIdsFromDeploymentDetail(token, id, teamParams);
    if (buildIds.length === 0) {
      console.log(`No build IDs found on deployment detail. (Vercel object shape didn’t include builds.)`);
      console.log(`Next move: open Vercel UI and click "Build Logs" for this deployment to confirm build id exists.`);
      continue;
    }

    // 2) Pull logs for first build (usually one is enough)
    const buildId = buildIds[0];
    console.log(`BuildId: ${buildId}`);

    let lines = [];
    try {
      lines = await fetchAllBuildLogLines(token, id, buildId, teamParams);
    } catch (e) {
      console.log(`Could not fetch build logs via events endpoint:\n${e?.message || e}`);
      continue;
    }

    if (lines.length === 0) {
      console.log(`No build log lines returned.`);
      continue;
    }

    const idx = findFirstErrorLineIndex(lines);
    if (idx === -1) {
      console.log(`No obvious "Error:" line found. Dumping last 80 lines:\n`);
      console.log(lines.slice(-80).join("\n"));
      continue;
    }

    console.log(`\n--- First Error (with context) ---\n`);
    console.log(formatContext(lines, idx, 22));
  }

  console.log(`\nDone.\n`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
