# tools/biome-sweep.ps1
# Purpose: Run Biome in a way that ALWAYS produces value:
# - format first
# - then check --write
# - keep output folders ignored
# - keep "noExplicitAny" from blocking autofix on API routes
#
# Usage:
#   pwsh tools/biome-sweep.ps1
#   pwsh tools/biome-sweep.ps1 -Paths @("apps","packages") -FailOnErrors
# Logs:
#   ./.biome-sweep/biome-check.log
#   ./.biome-sweep/biome-format.log

[CmdletBinding()]
param(
  [string[]] $Paths = @("apps", "packages"),
  [switch] $FailOnErrors
)

$ErrorActionPreference = "Stop"
$repoRoot = (Get-Location).Path
$outDir = Join-Path $repoRoot ".biome-sweep"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$configPath = Join-Path $repoRoot "biome.autofix.jsonc"
if (-not (Test-Path $configPath)) {
  throw "Missing biome.autofix.jsonc at repo root. Create it (see provided template) and re-run."
}

$formatLog = Join-Path $outDir "biome-format.log"
$checkLog  = Join-Path $outDir "biome-check.log"

Write-Host "== Biome sweep =="
Write-Host "Config: $configPath"
Write-Host "Paths:  $($Paths -join ' ')"
Write-Host "Logs:   $outDir"
Write-Host ""

# 1) FORMAT (always useful, never blocked by lint rules)
Write-Host "1) Formatting..."
& pnpm exec biome format --write --config-path $configPath @Paths 2>&1 | Tee-Object -FilePath $formatLog
$formatExit = $LASTEXITCODE

if ($formatExit -ne 0) {
  Write-Host ""
  Write-Host "Formatting exited with code $formatExit. See $formatLog"
  if ($FailOnErrors) { exit $formatExit }
}

# 2) CHECK+WRITE (safe fixes + imports + formatting; write what it can)
# Note: We lift the diagnostic cap so the log is complete.
Write-Host ""
Write-Host "2) Check + safe write (logged)..."
& pnpm exec biome check --write --config-path $configPath --max-diagnostics none @Paths 2>&1 | Tee-Object -FilePath $checkLog
$checkExit = $LASTEXITCODE

Write-Host ""
Write-Host "Done."
Write-Host "Format log: $formatLog"
Write-Host "Check log:  $checkLog"
Write-Host "Exit code:  $checkExit"

if ($FailOnErrors) {
  exit $checkExit
} else {
  # Default: do not fail the shell just because lint still exists.
  exit 0
}
