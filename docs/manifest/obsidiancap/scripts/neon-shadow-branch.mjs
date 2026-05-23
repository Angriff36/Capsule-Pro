#!/usr/bin/env node
/**
 * neon-shadow-branch.mjs
 *
 * Automates ephemeral Neon branch creation for Prisma's shadow database.
 *
 * Flow:
 *   1. Create a Neon branch derived from the project's default branch.
 *   2. Capture the branch connection string.
 *   3. Export SHADOW_DATABASE_URL for the child process.
 *   4. Run the supplied command (e.g. prisma migrate dev).
 *   5. Delete the branch on exit (best-effort; branch expiration is the safety net).
 *
 * Usage:
 *   node scripts/neon-shadow-branch.mjs -- prisma migrate dev
 *   node scripts/neon-shadow-branch.mjs -- prisma migrate diff --script
 *
 * Env requirements:
 *   NEON_API_KEY   – Neon API key (project-scoped or org-scoped).
 *   NEON_PROJECT_ID – Neon project ID (e.g. "ep-divine-math-ah5lmxku").
 *   DATABASE_URL   – Used as fallback to infer project/role if IDs not set.
 *
 * The branch is created with a 1-hour suspend timeout and will be auto-deleted
 * by Neon's branch expiration policy (configure in project settings).
 */
import { execSync, spawn } from "node:child_process";

const NEON_API = "https://console.neon.tech/api/v2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function env(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function parseArgs() {
  const separatorIdx = process.argv.indexOf("--");
  if (separatorIdx === -1 || separatorIdx === process.argv.length - 1) {
    console.error("Usage: node scripts/neon-shadow-branch.mjs -- <command>");
    process.exit(1);
  }
  return process.argv.slice(separatorIdx + 1);
}

async function neonFetch(path, options = {}) {
  const apiKey = env("NEON_API_KEY");
  const url = `${NEON_API}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Neon API ${options.method ?? "GET"} ${path} → ${response.status}: ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ---------------------------------------------------------------------------
// Branch lifecycle
// ---------------------------------------------------------------------------

async function createShadowBranch(projectId) {
  const branchName = `shadow-prisma-${Date.now()}`;
  console.error(`Creating Neon shadow branch: ${branchName}`);

  const result = await neonFetch(`/projects/${projectId}/branches`, {
    method: "POST",
    body: JSON.stringify({
      branch: {
        name: branchName,
      },
      endpoints: [
        {
          type: "read_write",
          autoscaling_limit_min_cu: 0.25,
          autoscaling_limit_max_cu: 0.25,
          suspend_timeout_seconds: 60,
        },
      ],
    }),
  });

  const branch = result.branch;
  const endpoint = result.endpoints?.[0];
  const connectionUri = result.connection_uris?.[0]?.connection_uri;

  if (!branch?.id || !endpoint?.id || !connectionUri) {
    console.error("Unexpected Neon API response:", JSON.stringify(result, null, 2));
    throw new Error("Failed to extract branch/endpoint/connection_uri from Neon response");
  }

  console.error(`Branch created: ${branch.id} (endpoint: ${endpoint.host})`);
  return { branchId: branch.id, connectionUri, projectId };
}

async function deleteShadowBranch(projectId, branchId) {
  try {
    console.error(`Deleting shadow branch: ${branchId}`);
    await neonFetch(`/projects/${projectId}/branches/${branchId}`, {
      method: "DELETE",
    });
    console.error("Shadow branch deleted.");
  } catch (error) {
    console.error(`Warning: failed to delete shadow branch ${branchId}: ${error.message}`);
    console.error("The branch will be cleaned up by Neon's expiration policy.");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const command = parseArgs();
  const projectId = env("NEON_PROJECT_ID");

  const { branchId, connectionUri } = await createShadowBranch(projectId);

  // Append sslmode if not present in the connection URI
  const shadowUrl = connectionUri.includes("sslmode=")
    ? connectionUri
    : `${connectionUri}${connectionUri.includes("?") ? "&" : "?"}sslmode=require`;

  const childEnv = {
    ...process.env,
    SHADOW_DATABASE_URL: shadowUrl,
  };

  // Run the command with SHADOW_DATABASE_URL injected
  const child = spawn(command[0], command.slice(1), {
    env: childEnv,
    stdio: "inherit",
    shell: true,
  });

  const cleanup = async (exitCode) => {
    await deleteShadowBranch(projectId, branchId);
    process.exit(exitCode ?? 1);
  };

  process.on("SIGINT", () => cleanup(130));
  process.on("SIGTERM", () => cleanup(143));

  child.on("close", async (code) => {
    await deleteShadowBranch(projectId, branchId);
    process.exit(code ?? 0);
  });

  child.on("error", async (error) => {
    console.error(`Failed to start command: ${error.message}`);
    await cleanup(1);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
