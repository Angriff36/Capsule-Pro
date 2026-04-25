#!/bin/bash
# Ralph Wiggum Loop — Capsule Pro
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited
#   ./loop.sh 20           # Build mode, max 20
#   ./loop.sh plan         # Plan mode, unlimited
#   ./loop.sh plan 15      # Plan mode, max 15 iterations

set -euo pipefail

if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

# ── Pre-run backup: commit existing findings so they survive the next run ──
if [ -f "IMPLEMENTATION_PLAN.md" ] && ! git diff --quiet IMPLEMENTATION_PLAN.md; then
    echo "📦 Backing up IMPLEMENTATION_PLAN.md..."
    cp IMPLEMENTATION_PLAN.md "IMPLEMENTATION_PLAN.md.bak.$(date +%Y%m%d-%H%M%S)"
    git add IMPLEMENTATION_PLAN.md PROMPT_plan.md 2>/dev/null || true
    git commit --no-verify -m "ralph: auto-backup findings before pass" 2>/dev/null || true
    echo "✓ Backup committed"
fi

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --verbose

    # Commit + push after each iteration
    git add IMPLEMENTATION_PLAN.md PROMPT_plan.md 2>/dev/null || true
    git commit --no-verify -m "ralph: findings from $MODE iteration $((ITERATION+1))" 2>/dev/null || true
    git push origin "$CURRENT_BRANCH" 2>/dev/null || {
        git push -u origin "$CURRENT_BRANCH" 2>/dev/null || true
    }

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done
