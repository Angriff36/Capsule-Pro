#!/usr/bin/env node
/**
 * Verify whether a Vercel domain (e.g. capsule-pro-api.vercel.app) is pinned to an older deployment.
 *
 * Requires:
 *   - VERCEL_TOKEN in env
 *
 * Usage:
 *   node scripts/apialignment.mjs --apiProject capsule-pro-api --apiHost capsule-pro-api.vercel.app --teamId team_...
 */

import process from "node:process";

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

// Accepts:
// - epoch ms (number)
// - epoch seconds (number)
// - ISO date string (e.g. "2017-04-26T23:00:34.232Z")
// Returns ISO string or null if invalid.
function toIso(value) {
  if (value == null) return null;

  // ISO string path (Vercel alias "created" is documented as string<date-time>)
  if (typeof value === "string") {
    const s = value.trim();
    // If it's numeric-as-string, fall through to numeric handling
    if (/^\d+$/.test(s)) {
      value = Number(s);
    } else {
      const d = new Date(s);
      const t = d.getTime();
      if (Number.isNaN(t)) return null;
      return d.toISOString();
    }
  }

  const n = Number(value);
  if (Number.isNaN(n)) return null;

  // Heuristic: > 10^10 is ms, otherwise seconds
  const ms = n > 10_000_000_000 ? n : n * 1000;
  const d = new Date(ms);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return d.toISOString();
}

async function vercelApiGet(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} :: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function getProject(token, idOrName, teamId) {
  const u = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(idOrName)}`);
  if (teamId) u.searchParams.set("teamId", teamId);
  const data = await vercelApiGet(token, u.toString());
  const projectId = data.id || data.projectId;
  if (!projectId) die(`Could not determine project id for "${idOrName}".`);
  return { id: projectId, name: data.name || idOrName, teamId: data.teamId || teamId || null };
}

async function getLatestProdDeployment(token, projectId, teamId) {
  const u = new URL("https://api.vercel.com/v6/deployments");
  u.searchParams.set("projectId", projectId);
  u.searchParams.set("target", "production");
  u.searchParams.set("limit", "5");
  u.searchParams.set("state", "READY");
  if (teamId) u.searchParams.set("teamId", teamId);

  const data = await vercelApiGet(token, u.toString());
  const dep = (data.deployments || [])[0];
  if (!dep) return null;

  const createdIso = toIso(dep.created ?? dep.createdAt);
  return { id: dep.uid || dep.id, url: dep.url, name: dep.name, createdIso };
}

async function listAliases(token, { teamId, projectId }) {
  const u = new URL("https://api.vercel.com/v4/aliases");
  if (teamId) u.searchParams.set("teamId", teamId);
  if (projectId) u.searchParams.set("projectId", projectId);
  u.searchParams.set("limit", "200");
  return await vercelApiGet(token, u.toString());
}

async function main() {
  const args = parseArgs(process.argv);
  const token = process.env.VERCEL_TOKEN;
  if (!token) die("Set VERCEL_TOKEN in your environment.");

  const apiProject = args.apiProject;
  const apiHost = args.apiHost;
  const teamId = args.teamId || process.env.TEAM_ID || null;

  if (!apiProject) die('Missing --apiProject (example: --apiProject capsule-pro-api)');
  if (!apiHost) die('Missing --apiHost (example: --apiHost capsule-pro-api.vercel.app)');

  console.log("== Inputs ==");
  console.log(`API project: ${apiProject}`);
  console.log(`API host: ${apiHost}`);
  console.log(`Team ID: ${teamId || "(none provided)"}`);

  console.log("\n== Resolve API project ==");
  const api = await getProject(token, apiProject, teamId);
  const effectiveTeamId = teamId || api.teamId || null;
  console.log(`API: ${api.name}  id=${api.id}`);
  console.log(`Effective teamId: ${effectiveTeamId || "(none)"}`);

  console.log("\n== Latest API production deployment (READY) ==");
  const apiProd = await getLatestProdDeployment(token, api.id, effectiveTeamId);
  if (!apiProd) {
    console.log("API: no READY production deployment found.");
    process.exit(0);
  }
  console.log(`API PROD: ${apiProd.url}  (${apiProd.createdIso ?? "unknown time"})  [${apiProd.id}]`);

  console.log("\n== Alias lookup (what is the domain pointing at?) ==");
  const aliasList = await listAliases(token, { teamId: effectiveTeamId, projectId: api.id });
  const aliases = aliasList.aliases || aliasList || [];
  const match = aliases.find((a) => a.alias === apiHost);

  if (!match) {
    console.log("No alias record found for that host under this API project.");
    process.exit(0);
  }

  const aliasDeploymentId =
    match.deploymentId || match.deployment?.id || match.deployment?.deploymentId || null;

  const aliasCreatedIso = toIso(match.created);

  console.log(`Alias: ${match.alias}`);
  console.log(`Alias deploymentId: ${aliasDeploymentId ?? "unknown"}`);
  console.log(`Alias created: ${aliasCreatedIso ?? "unknown"}`);

  console.log("\n== Verdict ==");
  if (!aliasDeploymentId) {
    console.log("Alias exists, but deploymentId is missing in the response.");
    process.exit(0);
  }

  if (aliasDeploymentId === apiProd.id) {
    console.log("The API domain is pointing at the CURRENT API production deployment.");
  } else {
    console.log("The API domain is pinned to an OLDER deployment than current API production.");
  }
}

main().catch((err) => {
  console.error("\nFatal:", err?.message || err);
  process.exit(1);
});
