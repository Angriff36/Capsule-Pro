#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
import json

context = """=== Capsule Pro Convex — agent context (non-blocking) ===

Architecture (this repo):
- Read `constitution.md` before Manifest/Convex architectural changes.
- Optional: `manifest/AGENTS.md`, `manifest/task_plan.md` for migration status.

Library / framework APIs (Next.js, Convex, Clerk, etc.):
- Use Context7 MCP: resolve-library-id then query-docs.
- For Next.js bundled docs: node_modules/next/dist/docs/ when Context7 is unavailable.

Do NOT block on missing optional files (manifest/IMPLEMENTATION_PROMPT.md, manifest/notes.md, manifest/phase-out-registry.md may not exist).

Project hooks: no PreToolUse write gate — edits are allowed immediately.
=== END CONTEXT ==="""

print(json.dumps({"additional_context": context}))
PY
