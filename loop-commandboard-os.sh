#!/bin/bash
# AI-Native Command Board OS Loop
# Usage: ./loop-commandboard-os.sh [plan] [max_iterations]
# Examples:
#   ./loop-commandboard-os.sh              # Build mode, unlimited iterations
#   ./loop-commandboard-os.sh 10           # Build mode, max 10 iterations
#   ./loop-commandboard-os.sh plan         # Plan mode, unlimited iterations
#   ./loop-commandboard-os.sh plan 3       # Plan mode, max 3 iterations

# Parse arguments
if [ "$1" = "plan" ]; then
    # Plan mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan_commandboard_os.md"
    IMPL_PLAN="IMPLEMENTATION_PLAN_commandboard_os.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    # Build mode with max iterations
    MODE="build"
    PROMPT_FILE="PROMPT_build_commandboard_os.md"
    IMPL_PLAN="IMPLEMENTATION_PLAN_commandboard_os.md"
    MAX_ITERATIONS=$1
else
    # Build mode, unlimited (no arguments or invalid input)
    MODE="build"
    PROMPT_FILE="PROMPT_build_commandboard_os.md"
    IMPL_PLAN="IMPLEMENTATION_PLAN_commandboard_os.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Task:   AI-Native Command Board OS"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Plan:   $IMPL_PLAN"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

# Create implementation plan if it doesn't exist
if [ ! -f "$IMPL_PLAN" ]; then
    echo "# AI-Native Command Board OS — Implementation Plan" > "$IMPL_PLAN"
    echo "" >> "$IMPL_PLAN"
    echo "**Last Updated**: $(date +%Y-%m-%d)" >> "$IMPL_PLAN"
    echo "**Goal**: Transform Command Board into AI-Native Command Board OS" >> "$IMPL_PLAN"
    echo "**Spec**: specs/command-board/boardspec.md" >> "$IMPL_PLAN"
    echo "" >> "$IMPL_PLAN"
    echo "---" >> "$IMPL_PLAN"
    echo "" >> "$IMPL_PLAN"
    echo "## Pending Items" >> "$IMPL_PLAN"
    echo "" >> "$IMPL_PLAN"
    echo "(To be populated by plan mode)" >> "$IMPL_PLAN"
    echo "" >> "$IMPL_PLAN"
    echo "Created: $IMPL_PLAN"
fi

# Setup log file for this run
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="loop-commandboard-os-${MODE}-${TIMESTAMP}.log"

# Redirect all output to log AND terminal
exec > >(tee "$LOG_FILE") 2>&1

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== ITERATION $ITERATION ========================\n"

    # Run Ralph with selected prompt
    # Plan mode uses Opus for deep reasoning about architecture
    # Build mode uses Opus for complex manifest/domain decisions
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" || {
        echo "Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    # Small delay to prevent rate limiting
    sleep 2
done

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AI-Native Command Board OS Loop Complete"
echo "Total iterations: $ITERATION"
echo "Log saved to: $LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
