#!/bin/bash
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

# Parse arguments
if [ "$1" = "plan" ]; then
    # Plan mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [ "$1" = "build" ]; then
    # Build mode
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
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

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

# Skip Husky hooks
export HUSKY=0

has_gh_cli() {
    command -v gh >/dev/null 2>&1
}

pr_exists_for_branch() {
    has_gh_cli && gh pr view --json number >/dev/null 2>&1
}

wait_for_pr_checks() {
    if ! has_gh_cli; then
        echo "gh CLI not found; skipping GitHub PR check watch."
        return
    fi

    if ! pr_exists_for_branch; then
        echo "No GitHub PR detected for $CURRENT_BRANCH; skipping PR checks."
        return
    fi

    echo "Watching GitHub PR checks for $CURRENT_BRANCH (fail fast)..."
    if ! gh pr checks --watch --fail-fast; then
        echo "GitHub PR checks reported a failure or were canceled. See the output above."
    fi

    echo "Serialized GitHub PR check summary:"
    gh pr checks --json name,state,bucket,description,detailsUrl || true
}

request_coderabbit_review() {
    if ! has_gh_cli || ! pr_exists_for_branch; then
        return
    fi

    local iteration_label=$((ITERATION + 1))
    local comment_body
    comment_body=$(cat <<EOF
@coderabbitai review

Automation loop iteration ${iteration_label} on branch ${CURRENT_BRANCH}.
EOF
)

    echo "Requesting a CodeRabbit summary comment for iteration ${iteration_label}..."
    if ! gh pr comment -b "$comment_body"; then
        echo "Unable to issue the CodeRabbit review command; trigger it manually if needed."
    fi
}

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Structured output for logging/monitoring
    # --verbose: Detailed execution logging
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --verbose

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" || {
        echo "Failed to push. Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    wait_for_pr_checks
    request_coderabbit_review

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done
