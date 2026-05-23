# save as: scripts\audit-tenant-field-usage.ps1
# run from repo root (or pass -Root)
#   pwsh .\scripts\audit-tenant-field-usage.ps1 -Root "C:\Projects\capsule-pro\apps\app"
# outputs:
#   tenant-field-audit.json
#   tenant-field-audit.txt

[CmdletBinding()]
param(
  [string]$Root = (Get-Location).Path,
  [string]$OutJson = "tenant-field-audit.json",
  [string]$OutText = "tenant-field-audit.txt"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Directories we don't want to scan
$ExcludeDirNames = @(
  "node_modules", ".next", "dist", "build", "out", ".turbo", ".git", ".pnpm", ".cache"
)

# File extensions we DO want to scan (add more if needed)
$IncludeExt = @(
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".sql", ".prisma",
  ".md", ".txt"
)

# Tokens we care about
$TokenPatterns = @(
  @{ Token = "tenant_id_id"; Regex = "\btenant_id_id\b" },
  @{ Token = "tenantId_id";   Regex = "\btenantId_id\b" },
  @{ Token = "tenant_id";     Regex = "\btenant_id\b" },
  @{ Token = "tenantId";      Regex = "\btenantId\b" }
)

# SQL-ish indicators: if present on the same line, we assume snake_case belongs there
$SqlIndicators = @(
  'SELECT','FROM','WHERE','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','OUTER JOIN',
  'INSERT','UPDATE','DELETE','ON CONFLICT','RETURNING','VALUES','GROUP BY','ORDER BY',
  'Prisma.sql`','$queryRaw','$executeRaw'
)


function Should-ExcludePath([string]$Path) {
  foreach ($d in $ExcludeDirNames) {
    # match path segment: \node_modules\ etc
    if ($Path -match "([\\/])$([regex]::Escape($d))([\\/])") { return $true }
  }
  return $false
}

function Is-TextFileWeCareAbout([System.IO.FileInfo]$File) {
  return $IncludeExt -contains $File.Extension.ToLowerInvariant()
}

function LooksLikeSqlLine([string]$Line) {
  foreach ($k in $SqlIndicators) {
    if ($Line -match [regex]::Escape($k)) { return $true }
  }
  return $false
}

function ClassifyHit(
  [string]$FilePath,
  [string]$Ext,
  [string]$Line,
  [int]$LineNumber,
  [string]$Token
) {
  $isSqlFile = ($Ext -eq ".sql")
  $sqlish = $isSqlFile -or (LooksLikeSqlLine $Line)

  # Heuristics for "Prisma input object" usage in TS/TSX/JS:
  # - object key "tenant_id:" is suspicious unless it's clearly a raw SQL row type/returning
  $prismaInputLikely = $false
  if ($Ext -in @(".ts",".tsx",".js",".jsx",".mjs",".cjs")) {
    if ($Line -match "\b(where|data|create|update|upsert|delete)\b" -and $Line -match "tenant_id") {
      $prismaInputLikely = $true
    }
    if ($Line -match "^\s*tenant_id\s*:" ) {
      # could be raw result typing OR prisma input; treat as "needs review"
      $prismaInputLikely = $true
    }
    if ($Token -eq "tenant_id_id") {
      # Prisma compound unique/ID inputs are based on Prisma field names, not DB column names
      $prismaInputLikely = $true
    }
  }

  $action = "review"
  $why = @()

  if ($Token -eq "tenant_id_id") {
    $action = "replace_likely"
    $why += "compound input token uses snake_case; Prisma composite input names derive from schema field names"
  }
  elseif ($Token -eq "tenantId_id") {
    $action = "keep_likely"
    $why += "already camelCase compound input"
  }
  elseif ($Token -eq "tenant_id") {
    if ($sqlish) {
      $action = "keep_likely"
      $why += "appears in SQL-ish context; DB column name is tenant_id"
    } elseif ($prismaInputLikely) {
      $action = "replace_likely"
      $why += "appears in app code object/where/data context; Prisma field name should be tenantId"
    } else {
      $action = "review"
      $why += "not obviously SQL or Prisma input; could be raw row shape"
    }
  }
  elseif ($Token -eq "tenantId") {
    if ($sqlish) {
      $action = "review"
      $why += "camelCase inside SQL-ish line is unusual; check if aliasing or bug"
    } else {
      $action = "keep_likely"
      $why += "Prisma/client-side field name is tenantId"
    }
  }

  return [pscustomobject]@{
    file = $FilePath
    ext = $Ext
    line = $LineNumber
    token = $Token
    action = $action
    why = ($why -join "; ")
    preview = $Line.Trim()
  }
}

$rootFull = (Resolve-Path $Root).Path

# Collect files
$files = Get-ChildItem -Path $rootFull -Recurse -File |
  Where-Object { -not (Should-ExcludePath $_.FullName) } |
  Where-Object { Is-TextFileWeCareAbout $_ }

$results = New-Object System.Collections.Generic.List[object]

foreach ($f in $files) {
  $ext = $f.Extension.ToLowerInvariant()

  # Stream line-by-line so we don't blow memory on large files
  $lineNo = 0
  foreach ($line in [System.IO.File]::ReadLines($f.FullName)) {
    $lineNo++

    foreach ($p in $TokenPatterns) {
      if ($line -match $p.Regex) {
        $results.Add((ClassifyHit -FilePath $f.FullName -Ext $ext -Line $line -LineNumber $lineNo -Token $p.Token))
      }
    }
  }
}

# Summaries
$summary = $results |
  Group-Object action |
  Sort-Object Name |
  ForEach-Object {
    [pscustomobject]@{ action = $_.Name; count = $_.Count }
  }

# Write JSON
$payload = [pscustomobject]@{
  root = $rootFull
  scannedFiles = $files.Count
  hits = $results.Count
  summary = $summary
  results = $results
}

$payload | ConvertTo-Json -Depth 6 | Set-Content -Path $OutJson -Encoding utf8

# Write human-friendly text
$summaryText = $summary | Format-Table -AutoSize | Out-String
$topText = $results |
  Sort-Object action, file, line |
  Select-Object action, token, file, line, why, preview |
  Format-Table -AutoSize |
  Out-String

@"
ROOT: $rootFull
SCANNED FILES: $($files.Count)
TOTAL HITS: $($results.Count)

SUMMARY:
$summaryText

DETAILS:
$topText
"@ | Set-Content -Path $OutText -Encoding utf8

Write-Host "Wrote $OutJson"
Write-Host "Wrote $OutText"
Write-Host ""
Write-Host "Next step: open $OutText and start with action=replace_likely (those are your best candidates)."
