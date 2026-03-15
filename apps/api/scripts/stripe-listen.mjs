import { spawn } from "node:child_process";

const args = ["listen", "--forward-to", "localhost:2223/webhooks/payments"];

const child = spawn("stripe", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(
    "[stripe] Failed to start Stripe CLI. Skipping local webhook forwarding.",
    error
  );
  process.exit(0);
});

child.on("exit", (code, signal) => {
  if (code === 0) process.exit(0);

  console.error(
    `[stripe] Stripe CLI exited (${signal ?? code}). Continuing without webhook forwarding.`
  );
  process.exit(0);
});
