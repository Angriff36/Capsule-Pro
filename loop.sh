#!/bin/bash
# Ralph Wiggum Loop for Convoy (bounded + hook-safe)
# Usage:
#   ./loop.sh                 # build mode, 1 iteration
#   ./loop.sh 10              # build mode, max 10 iterations
#   ./loop.sh plan            # plan mode, 1 iteration (default)
#   ./loop.sh plan 3          # plan mode, max 3 iterations

set -euo pipefail

# ---------- Parse arguments ----------
if [ "${1:-}" = "plan" ]; then
  MODE="plan"
  PROMPT_FILE="PROMPT_plan.md"
  MAX_ITERATIONS=${2:-1}   # IMPORTANT: plan defaults to 1
elif [[ "${1:-}" =~ ^[0-9]+$ ]]; then
  MODE="build"
  PROMPT_FILE="PROMPT_build.md"
  MAX_ITERATIONS=$1
else
  MODE="build"
  PROMPT_FILE="PROMPT_build.md"
  MAX_ITERATIONS=${1:-1}   # IMPORTANT: build defaults to 1
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
echo "Max:    $MAX_ITERATIONS iteration(s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: $PROMPT_FILE not found"
  exit 1
fi

# ---------- Safety: planning must be side-effect free ----------
if [ "$MODE" = "plan" ]; then
  # Common env flags used by tools/hooks to suppress heavy work
  export CI=1
  export SKIP_BUILD=1
  export SKIP_TESTS=1
  export HUSKY=0
fi

# ---------- Permissions mode (avoid permanent YOLO) ----------
# If you want YOLO only in sandbox branches:
#   sandbox/* -> skip permissions
PERMISSIONS_ARGS=()
if [[ "$CURRENT_BRANCH" == sandbox/* ]]; then
  PERMISSIONS_ARGS+=(--dangerously-skip-permissions)
fi

# ---------- Main loop ----------
while true; do
  if [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
    echo "Reached max iterations: $MAX_ITERATIONS"
    break
  fi

  echo "----- Iteration $((ITERATION + 1)) / $MAX_ITERATIONS -----"

  # Snapshot state
  BEFORE_STATUS=$(git status --porcelain || true)
  BEFORE_HEAD=$(git rev-parse HEAD)

  # Run Claude headless with selected prompt
  cat "$PROMPT_FILE" | claude -p \
    "${PERMISSIONS_ARGS[@]}" \
    --output-format=stream-json \
    --verbose

  # If nothing changed, stop (prevents infinite “no-op” loops)
  AFTER_STATUS=$(git status --porcelain || true)
  if [ "$BEFORE_STATUS" = "$AFTER_STATUS" ]; then
    echo "No working tree changes detected. Exiting."
    break
  fi

  # If no new commit was created, do NOT push.
  AFTER_HEAD=$(git rev-parse HEAD)
  if [ "$BEFORE_HEAD" = "$AFTER_HEAD" ]; then
    echo "No new commit created this iteration. Not pushing."
  else
    echo "New commit detected. Pushing..."
    git push origin "$CURRENT_BRANCH" || git push -u origin "$CURRENT_BRANCH"
  fi

  ITERATION=$((ITERATION + 1))
  echo -e "\n======================== LOOP $ITERATION COMPLETE ========================\n"
done
