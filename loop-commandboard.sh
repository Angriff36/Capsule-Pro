#!/bin/bash
# Command Board Bug Fixes Loop
# Usage: ./loop-commandboard.sh [plan] [max_iterations]
# Examples:
#   ./loop-commandboard.sh              # Build mode, unlimited iterations
#   ./loop-commandboard.sh 10           # Build mode, max 10 iterations
#   ./loop-commandboard.sh plan         # Plan mode, unlimited iterations
#   ./loop-commandboard.sh plan 3       # Plan mode, max 3 iterations

# Parse arguments
if [ "$1" = "plan" ]; then
    # Plan mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan_commandboard_bugs.md"
    IMPL_PLAN="IMPLEMENTATION_PLAN_commandboard_bugs.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    # Build mode with max iterations
    MODE="build"
    PROMPT_FILE="PROMPT_build_commandboard_bugs.md"
    IMPL_PLAN="IMPLEMENTATION_PLAN_commandboard_bugs.md"
    MAX_ITERATIONS=$1
else
    # Build mode, unlimited (no arguments or invalid input)
    MODE="build"
    PROMPT_FILE="PROMPT_build_commandboard_bugs.md"
    IMPL_PLAN="IMPLEMENTATION_PLAN_commandboard_bugs.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Task:   Command Board Bug Fixes"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Plan:   $IMPL_PLAN"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify files exist
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

if [ ! -f "$IMPL_PLAN" ]; then
    echo "Error: $IMPL_PLAN not found"
    exit 1
fi

# Setup log file for this run
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="loop-commandboard-${MODE}-${TIMESTAMP}.log"

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
    # Using Sonnet for faster iterations on well-defined bug fixes
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model sonnet \
        --verbose

    # Check if implementation plan exists and has remaining tasks
    if [ -f "$IMPL_PLAN" ]; then
        # Count uncompleted tasks (lines with [ ] but not [x])
        PENDING=$(grep -c "^\[.\].*Pending" "$IMPL_PLAN" 2>/dev/null || echo "0")
        
        if [ "$PENDING" = "0" ]; then
            echo "✅ All tasks completed! Implementation plan finished."
            break
        else
            echo "📋 $PENDING tasks remaining"
        fi
    fi

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" || {
        echo "Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    # Small delay to prevent rate limiting
    sleep 2
done

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Command Board Bug Fixes Loop Complete"
echo "Total iterations: $ITERATION"
echo "Log saved to: $LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
