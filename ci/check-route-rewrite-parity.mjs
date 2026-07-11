#!/usr/bin/env node
// Route ⇄ rewrite parity gate. Every top-level segment under
// apps/api/app/api/ must have a matching `/api/<segment>/:path*` rewrite in
// apps/app/next.config.ts, or the app silently 404s while the API works —
// the documented footgun this check replaces.
// Known-unproxied segments (webhooks, crons, health, plus untriaged legacy
// gaps) live in ci/route-rewrite-allowlist.json. Adding a NEW api segment
// without a rewrite fails CI. Shrink the allowlist as gaps get triaged.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const allowlist = new Set(
  JSON.parse(
    readFileSync(
      new URL("./route-rewrite-allowlist.json", import.meta.url),
      "utf8"
    )
  ).segments
);

const apiDir = "apps/api/app/api";
const segments = readdirSync(apiDir).filter((e) =>
  statSync(join(apiDir, e)).isDirectory()
);

const config = readFileSync("apps/app/next.config.ts", "utf8");
const rewritten = new Set(
  [...config.matchAll(/source: "\/api\/([^/"]+)/g)].map((m) => m[1])
);

const missing = segments.filter((s) => !(rewritten.has(s) || allowlist.has(s)));
const staleAllowlist = [...allowlist].filter(
  (s) => rewritten.has(s) || !segments.includes(s)
);

if (missing.length > 0) {
  console.error(
    `::error::API segments with no rewrite in apps/app/next.config.ts (the app will 404 on /api/${missing[0]}/* even though the API serves it): ${missing.join(", ")}`
  );
  console.error(
    "Add a rewrite for each, or — only if the segment is genuinely never called through the app — add it to ci/route-rewrite-allowlist.json with a reason."
  );
  process.exit(1);
}

if (staleAllowlist.length > 0) {
  console.log(
    `::notice::Allowlist entries now covered or gone — remove from ci/route-rewrite-allowlist.json: ${staleAllowlist.join(", ")}`
  );
}

console.log(
  `route-rewrite parity: ${segments.length} api segments, ${missing.length} unproxied outside allowlist (${allowlist.size} allowlisted).`
);
