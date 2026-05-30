#!/usr/bin/env bash
# SessionStart guardrail: inject a high-salience directive naming the planning
# files that MUST be read before any code work, and explain the read-gate.
# Output: JSON with hookSpecificOutput.additionalContext (injected into context).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJDIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STATE="$PROJDIR/.claude/.guardrail"
REQFILE="$SCRIPT_DIR/required-reads.txt"

# Prune guardrail state files older than 14 days (best-effort).
mkdir -p "$STATE"
find "$STATE" -type f -mtime +14 -delete 2>/dev/null || true

# Build the file list for the directive from the single source of truth.
files=""
while IFS= read -r req; do
  [ -z "$req" ] && continue
  files="${files}  - ${req}"$'\n'
done < "$REQFILE"

read -r -d '' MSG <<EOF || true
=== REPO GUARDRAIL: read planning docs before code work ===
Per AGENTS.md, before editing code OR running destructive git commands this
session you MUST read these governance/planning files:
${files}
constitution.md is the binding Manifest Integration Charter (governed writes go
through the runtime; reads bypass it). The others define the active plan,
phase-outs, and known gotchas.

ENFORCEMENT: a PreToolUse gate BLOCKS Edit/Write until every file above has been
opened with the Read tool in THIS session. If a write is blocked, read the listed
files first. To bypass for a trivial/non-code session, disable via /hooks.
=== END GUARDRAIL ===
EOF

jq -nc --arg ctx "$MSG" \
  '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$ctx}}'
