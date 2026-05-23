# `manifest/reports/` — Audit report output destination

Generated audit reports land here. **Gitignored**.

| Report | Producer | Files |
|---|---|---|
| direct-writes | `pnpm manifest:audit-direct-writes` (when restored on this branch) | `direct-writes.json`, `direct-writes.md` |
| schema-drift | `pnpm manifest:audit-schema-drift` (when restored on this branch) | `schema-drift.json`, `schema-drift.md` |
| enforce-surface | `pnpm exec manifest enforce-surface --format json` | `enforce-surface.json` |

Legacy reports may still exist under `manifest-audit/` at repo root —
that's the pre-cleanup output dir. It is gitignored; new audit scripts
should write here.
