#!/usr/bin/env node
// Protection-drift check: every required status-check context recorded in
// .github/branch-protection.json must correspond to a job that still exists
// in .github/workflows/*.yml (job id or display name). Renaming a job now
// breaks CI instead of silently disarming branch protection (the "ghost
// required check" failure mode found 2026-07-11).
// The committed JSON is the reviewable export of live protection — re-export
// after any protection change:
//   gh api repos/Angriff36/Capsule-Pro/branches/main/protection > .github/branch-protection.json
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const protection = JSON.parse(
  readFileSync(".github/branch-protection.json", "utf8")
);
const contexts = protection.required_status_checks?.contexts ?? [];

const known = new Set();
const wfDir = ".github/workflows";
for (const file of readdirSync(wfDir)) {
  if (!/\.ya?ml$/.test(file)) {
    continue;
  }
  const text = readFileSync(join(wfDir, file), "utf8");
  const jobsBlock = text.split(/^jobs:\s*$/m)[1];
  if (!jobsBlock) {
    continue;
  }
  // Job ids: 2-space-indented keys directly under jobs:
  for (const m of jobsBlock.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)) {
    known.add(m[1]);
  }
  // Job display names (what GitHub uses as the check context when present)
  for (const m of jobsBlock.matchAll(/^ {4}name:\s*(.+?)\s*$/gm)) {
    known.add(m[1].replace(/^["']|["']$/g, ""));
  }
}

// Checks created by GitHub apps rather than workflow jobs (code-scanning
// posts a summary check named "CodeQL").
const externalChecks = new Set(["CodeQL"]);

// Matrix jobs produce contexts like "Analyze (javascript-typescript)" from a
// name of "Analyze (${{ matrix.language }})" — compare with the parenthetical
// stripped when there is no exact match.
const PARENTHETICAL_RE = / \(.+\)$/;
const stripped = new Set(
  [...known].map((n) => n.replace(PARENTHETICAL_RE, ""))
);

const ghosts = contexts.filter(
  (c) =>
    !(
      known.has(c) ||
      externalChecks.has(c) ||
      stripped.has(c.replace(PARENTHETICAL_RE, ""))
    )
);
if (ghosts.length > 0) {
  console.error(
    `::error::Required branch-protection contexts with no matching workflow job (ghost checks — every PR blocks forever on these): ${ghosts.join(" | ")}`
  );
  console.error(
    "Either restore/rename the job, or update protection and re-export .github/branch-protection.json (command in this script's header)."
  );
  process.exit(1);
}

console.log(
  `protection-drift: ${contexts.length} required contexts, all match a workflow job.`
);
