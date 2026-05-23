#!/usr/bin/env node

/**
 * Convoy Development Server with Port Management
 * Checks/kills ports before starting dev server
 */

import { spawn } from "node:child_process";
import { log, resolvePortConfiguration } from "./port-utils.mjs";

const PORTS = [2221, 2222, 2223, 2225, 2226]; // app, web, api, email, studio

async function main() {
  console.log("");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "blue");
  log("  Convoy Development Server", "blue");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "blue");
  console.log("");

  // Check/kill ports
  const proceed = await resolvePortConfiguration(PORTS);

  if (!proceed) {
    process.exit(0);
  }

  console.log("");
  log("Starting development server...", "green");
  console.log("");

  // Start pnpm dev
  const devProcess = spawn("pnpm", ["dev"], {
    stdio: "inherit",
    shell: true,
  });

  devProcess.on("close", (code) => {
    process.exit(code || 0);
  });

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    devProcess.kill("SIGINT");
  });
}

await main();
