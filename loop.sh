#!/bin/bash
# Events UI Fix Loop
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations (fix UI issues)
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited (analyze and update plan)
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

# Parse arguments
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

clear
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎯 Events UI Fix Loop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Mode:   $MODE"
echo "  Prompt: $PROMPT_FILE"
echo "  Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "  Max:    $MAX_ITERATIONS iterations"
echo ""
echo "  Focus:  apps/web/app/events/*"
echo "  Target: P0 issues (theme, navigation, types, component size)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "❌ Error: $PROMPT_FILE not found"
    exit 1
fi

# Verify we're in the right project
if [ ! -f "IMPLEMENTATION_PLAN_SUMMARY.md" ]; then
    echo "⚠️  Warning: IMPLEMENTATION_PLAN_SUMMARY.md not found"
    echo "   This loop is designed for Events UI fixes in capsule-pro"
    echo ""
fi

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo ""
        echo "✅ Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    ITERATION=$((ITERATION + 1))
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                    LOOP $ITERATION                              ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls
    # --output-format=text: Human-readable streaming output
    # --model opus: Opus for complex refactoring decisions
    # --verbose: Show detailed progress
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=text \
        --model opus \
        --verbose

    echo ""
    echo "────────────────────────────────────────────────────────"
    echo "  📤 Pushing changes..."
    echo "────────────────────────────────────────────────────────"

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" 2>/dev/null || {
        echo "  Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    echo ""
    echo "  ✅ Iteration $ITERATION complete"
    echo ""

    # Brief pause between iterations
    if [ $MAX_ITERATIONS -eq 0 ] || [ $ITERATION -lt $MAX_ITERATIONS ]; then
        echo "  ⏳ Next iteration in 3 seconds... (Ctrl+C to stop)"
        sleep 3
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🏁 Loop finished after $ITERATION iteration(s)"
echo "  📖 Review: IMPLEMENTATION_PLAN.md for progress"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
