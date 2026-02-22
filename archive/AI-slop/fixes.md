# Fixes Log
<!--
  Record resolved issues after removing them from active tasks.
  Include a short issue description, the fix, and exact commands when possible.
  Append new entries; do not overwrite existing fixes.
  Rotate at 500 lines by renaming to fixes-YYYY-MM-DD.md and start a new fixes.md.
-->

## 2026-02-04
- **Issue:** Neon + Prisma "Database connection failed (Connection terminated unexpectedly)" in Next.js app even when Neon project is active.
- **Fix:** (1) In `packages/database/keys.ts`: rewrite direct Neon URL to pooler host, add `connect_timeout=15` and `sslmode=require`. (2) In `packages/database/index.ts`: set `neonConfig.poolQueryViaFetch = true` so queries use HTTP fetch instead of long-lived WebSocket, avoiding the driver bug (neondatabase/serverless#168).
- **Commands:** Restart Next dev server after changes.
- **Prevention:** Always use Neon pooled URL and `neonConfig.poolQueryViaFetch = true` with `@prisma/adapter-neon` + `@neondatabase/serverless` in serverless/Next.js.

## [DATE]
- Issue:
  Fix:
  Commands:
