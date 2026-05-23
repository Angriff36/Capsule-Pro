#!/usr/bin/env node
/**
 * Runs vercel bisect from the correct app directory.
 * Both --good and --bad URLs must be from the SAME Vercel project.
 *
 * Usage:
 *   pnpm vercel:bisect --project api --good <url> --bad <url>
 *   pnpm vercel:bisect api --good <url> --bad <url>
 *
 * Projects: api (capsule-pro-api), app (capsule-pro), docs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PROJECT_DIRS = {
  api: "apps/api",
  app: "apps/app",
  docs: "apps/docs",
};

const PROJECT_NAMES = {
  api: "capsule-pro-api",
  app: "capsule-pro",
  docs: "capsule-pro-docs",
};

function parseArgs() {
  const args = process.argv.slice(2);
  let project = null;
  let good = null;
  let bad = null;
  const extra = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project" || arg === "-p") {
      project = args[++i];
    } else if (arg === "--good" || arg === "-g") {
      good = args[++i];
    } else if (arg === "--bad" || arg === "-b") {
      bad = args[++i];
    } else if (!arg.startsWith("-") && !project && ["api", "app", "docs"].includes(arg)) {
      project = arg;
    } else {
      extra.push(arg);
    }
  }

  return { project, good, bad, extra };
}

async function main() {
  const { project, good, bad, extra } = parseArgs();

  if (!project || !PROJECT_DIRS[project]) {
    console.error("Usage: pnpm vercel:bisect --project <api|app|docs> --good <url> --bad <url> [--open|--path /x|--run script]");
    console.error("   or: pnpm vercel:bisect api --good <url> --bad <url>");
    console.error("");
    console.error("Both URLs must be from the SAME Vercel project:");
    console.error("  api  -> capsule-pro-api-*.vercel.app");
    console.error("  app  -> capsule-pro-*.vercel.app (no 'api' in name)");
    console.error("  docs -> capsule-pro-docs-*.vercel.app");
    process.exit(1);
  }

  const dir = path.join(ROOT, PROJECT_DIRS[project]);
  const projectName = PROJECT_NAMES[project];

  // Ensure project is linked (bisect fails with "no deployments" if not)
  console.log(`Linking to ${projectName}...`);
  const linkProc = spawn("vercel", ["link", "--yes", "--project", projectName], {
    cwd: dir,
    stdio: "inherit",
    shell: true,
  });

  await new Promise((resolve) => linkProc.on("exit", resolve));

  const bisectArgs = ["bisect"];
  if (good) bisectArgs.push("--good", good);
  if (bad) bisectArgs.push("--bad", bad);
  // Vercel bisect requires --path; default to / to avoid interactive prompt
  if (!extra.some((a) => a === "--path" || a === "-p")) {
    bisectArgs.push("--path", "/");
  }
  bisectArgs.push(...extra);

  console.log(`\nRunning vercel bisect in ${dir}...`);
  console.log(`  vercel ${bisectArgs.join(" ")}\n`);

  const proc = spawn("vercel", bisectArgs, {
    cwd: dir,
    stdio: "inherit",
    shell: true,
  });

  proc.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
