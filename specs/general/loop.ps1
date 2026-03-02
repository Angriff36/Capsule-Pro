#!/usr/bin/env pwsh
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

# Set GLM profile
$env:ANTHROPIC_AUTH_TOKEN = "8ca070a687c0467b90d547a9c5e89a52.DOnP0OHWQxQB3aos"
$env:ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic"
$env:ANTHROPIC_DEFAULT_MODEL = "glm-5"

# Determine prompt file
if ($Mode -eq "plan") {
  $PromptFile = "PROMPT_plan.md"
} else {
  $PromptFile = "PROMPT_build.md"
}

$Iteration = 0
$CurrentBranch = git branch --show-current

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "Mode:   $Mode"
Write-Host "Prompt: $PromptFile"
Write-Host "Branch: $CurrentBranch"
if ($MaxIterations -gt 0) {
  Write-Host "Max:    $MaxIterations iterations"
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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

  # Run Ralph iteration
  $Prompt = Get-Content $PromptFile -Raw
  $Prompt | claude -p --dangerously-skip-permissions --model glm-5 2>&1

  # Push changes after each iteration
  git push origin $CurrentBranch 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push. Creating remote branch..."
    git push -u origin $CurrentBranch
  }

  $Iteration++
  Write-Host ""
  Write-Host "======================== LOOP $Iteration ========================"
  Write-Host ""
}
