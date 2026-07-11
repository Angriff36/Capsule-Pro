#!/usr/bin/env node
// Native-shrink ratchet: NATIVE-REWRITE-PLAN.md success criteria as numbers
// that only go DOWN. Nobody can add a new empty-uuid default, inline role
// literal, bare status string, or hand-bound vercel cron without CI noticing.
// Lower ci/native-shrink-baseline.json as workstreams land to lock in wins.
// (Wired-middleware count from the plan is omitted: no crisp static pattern.)
// Pure Node (no rg) so it runs identically on dev machines and CI runners.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const baseline = JSON.parse(
  readFileSync(
    new URL("./native-shrink-baseline.json", import.meta.url),
    "utf8"
  )
);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      yield* walk(p);
    } else if (entry.endsWith(".manifest")) {
      yield p;
    }
  }
}

function countInSource(re) {
  let n = 0;
  for (const file of walk("manifest/source")) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (re.test(line)) {
        n++;
      }
    }
  }
  return n;
}

const counts = {
  uuidEmptyDefaults: countInSource(/uuid.*= ""/),
  roleLiterals: countInSource(/user\.role in \[/),
  statusStringFields: countInSource(/status: string/),
  vercelCrons: JSON.parse(readFileSync("apps/api/vercel.json", "utf8")).crons
    .length,
};

let failed = false;
for (const [key, value] of Object.entries(counts)) {
  const max = baseline[key];
  let dir = "flat";
  if (value > max) {
    dir = "REGRESSION";
  } else if (value < max) {
    dir = "improved";
  }
  console.log(`native-shrink ${key}: ${value} (baseline ${max}) ${dir}`);
  if (value > max) {
    failed = true;
  }
}

if (failed) {
  console.error(
    "::error::Native-shrink counts regressed — new non-native constructs were added. Use the native equivalent (uuid?/required uuid, roleAllows, enum, schedule decl) instead. Do not raise ci/native-shrink-baseline.json."
  );
  process.exit(1);
}

if (Object.entries(counts).some(([k, v]) => v < baseline[k])) {
  console.log(
    `::notice::Counts dropped — lower ci/native-shrink-baseline.json to ${JSON.stringify(counts)}.`
  );
}
