#!/usr/bin/env pwsh
# Ralph Wiggum Loop for Capsule-Pro
# Usage: ./loop.ps1 [plan] [max_iterations]
# Examples:
#   ./loop.ps1              # Build mode, unlimited iterations
#   ./loop.ps1 20           # Build mode, max 20 iterations
#   ./loop.ps1 plan         # Plan mode, unlimited iterations
#   ./loop.ps1 plan 5       # Plan mode, max 5 iterations

param(
  [string]$Mode = "build",
  [int]$MaxIterations = 0
)

# Set GLM profile for unlimited usage
$env:ANTHROPIC_AUTH_TOKEN = "8ca070a687c0467b90d547a9c5e89a52.DOnP0OHWQxQB3aos"
$env:ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic"
$env:ANTHROPIC_DEFAULT_MODEL = "glm-5"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"

# Determine prompt file (they're in root, not specs/general)
if ($Mode -eq "plan") {
  $PromptFile = "PROMPT_plan.md"
} else {
  $PromptFile = "PROMPT_build.md"
}

$Iteration = 0
$CurrentBranch = git branch --show-current

Write-Host "========================================"
Write-Host "Mode:   $Mode"
Write-Host "Prompt: $PromptFile"
Write-Host "Branch: $CurrentBranch"
Write-Host "Model:  GLM-5 (unlimited)"
if ($MaxIterations -gt 0) {
  Write-Host "Max:    $MaxIterations iterations"
}
Write-Host "========================================"

# Verify prompt file exists
if (-not (Test-Path $PromptFile)) {
  Write-Error "Error: $PromptFile not found"
  exit 1
}

while ($true) {
  if ($MaxIterations -gt 0 -and $Iteration -ge $MaxIterations) {
    Write-Host "Reached max iterations: $MaxIterations"
    break
  }

  Write-Host "Starting iteration $Iteration..."

  # Run Ralph iteration with prompt file
  $Prompt = Get-Content $PromptFile -Raw
  $Result = $Prompt | claude -p --dangerously-skip-permissions --model glm-5 2>&1
  
  Write-Host $Result

  # Push changes after each iteration
  $PushResult = git push origin $CurrentBranch 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push. Creating remote branch..."
    git push -u origin $CurrentBranch
  } else {
    Write-Host "Pushed to $CurrentBranch"
  }

  $Iteration++
  Write-Host ""
  Write-Host "======================== LOOP $Iteration ========================"
  Write-Host ""
}
