#!/bin/bash
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations
#
# Git / Vercel:
#   Plan mode does not push to origin unless LOOP_GIT_PUSH=1 (avoids remote + deploy churn).
#   Build mode pushes after each iteration when LOOP_GIT_PUSH is unset or 1; set LOOP_GIT_PUSH=0 to keep local only.
#   Commits made in build mode should include "[skip vercel]" in the message (see PROMPT_build.md) so Vercel
#   can skip deployments when your project uses an Ignored Build Step or turbo-ignore that honors that token.

# Parse arguments
if [ "$1" = "plan" ]; then
    # Plan mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    # Build mode with max iterations
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    # Build mode, unlimited (no arguments or invalid input)
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

if [ "$MODE" = "plan" ]; then
    PUSH_DEFAULT=0
else
    PUSH_DEFAULT=1
fi
case "${LOOP_GIT_PUSH:-}" in
    1 | true | yes | on) LOOP_DO_PUSH=1 ;;
    0 | false | no | off) LOOP_DO_PUSH=0 ;;
    "") LOOP_DO_PUSH=$PUSH_DEFAULT ;;
    *) LOOP_DO_PUSH=$PUSH_DEFAULT ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
echo "Push:   $([ "$LOOP_DO_PUSH" = 1 ] && echo "origin $CURRENT_BRANCH (set LOOP_GIT_PUSH=0 to disable)" || echo "disabled (plan default; set LOOP_GIT_PUSH=1 to push)")"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Structured output for logging/monitoring
    # --model opus: Primary agent uses Opus for complex reasoning (task selection, prioritization)
    #               Can use 'sonnet' in build mode for speed if plan is clear and tasks well-defined
    # --verbose: Detailed execution logging
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

    if [ "$LOOP_DO_PUSH" = 1 ]; then
        git push origin "$CURRENT_BRANCH" || {
            echo "Failed to push. Creating remote branch..."
            git push -u origin "$CURRENT_BRANCH"
        }
    else
        echo "Skipping git push (LOOP_GIT_PUSH / plan mode). Commits stay local until you push."
    fi

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done