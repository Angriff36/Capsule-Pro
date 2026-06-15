$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Projects\capsule-pro"
$OutFile = "C:\Users\Ryan\Documents\chatgptoutput.txt"

$Findings = New-Object System.Collections.Generic.List[object]

function Add-Finding {
  param(
    [string]$Category,
    [string]$Severity,
    [string]$File,
    [int]$Line,
    [string]$Rule,
    [string]$Evidence,
    [string]$Fix
  )

  $script:Findings.Add([pscustomobject]@{
    Category = $Category
    Severity = $Severity
    File = $File
    Line = $Line
    Rule = $Rule
    Evidence = ($Evidence -replace "`r|`n", " ").Trim()
    Fix = $Fix
  }) | Out-Null
}

function RelPath {
  param([string]$Path)
  if ($Path.StartsWith($ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $Path.Substring($ProjectRoot.Length).TrimStart("\")
  }
  return $Path
}

function Read-Text {
  param([string]$Path)
  try {
    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  } catch {
    try {
      return Get-Content -LiteralPath $Path -Raw
    } catch {
      return $null
    }
  }
}

function Resolve-ImportPath {
  param(
    [string]$BaseFile,
    [string]$ImportPath
  )

  if (-not ($ImportPath.StartsWith("."))) {
    return $null
  }

  $baseDir = Split-Path -Parent $BaseFile
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $baseDir $ImportPath))
  return $candidate
}

function Get-Rank {
  param([string]$Severity)
  switch ($Severity) {
    "HIGH" { return 1 }
    "MEDIUM" { return 2 }
    "LOW" { return 3 }
    default { return 4 }
  }
}

function Is-ExcludedPath {
  param([string]$Path)
  return $Path -match "\\(node_modules|\.next|\.turbo|dist|build|coverage|out|\.git)\\"
}

function Is-GeneratedPath {
  param([string]$Path)
  return $Path -match "\\(__generated__|generated|\.generated)\\"
}

function Get-CodeFiles {
  $extensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs")
  $files = foreach ($ext in $extensions) {
    Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File -Filter $ext -ErrorAction SilentlyContinue
  }

  return $files |
    Where-Object {
      -not (Is-ExcludedPath $_.FullName) -and
      -not (Is-GeneratedPath $_.FullName) -and
      $_.Length -lt 2000000
    } |
    Sort-Object FullName -Unique
}

function Strip-QuotedText {
  param([string]$Line)
  $x = $Line
  $x = [regex]::Replace($x, '"(?:\\.|[^"\\])*"', '""')
  $x = [regex]::Replace($x, "'(?:\\.|[^'\\])*'", "''")
  $x = [regex]::Replace($x, '`(?:\\.|[^`\\])*`', '``')
  $x = [regex]::Replace($x, "//.*$", "")
  return $x
}

function Count-Char {
  param([string]$Text, [char]$Char)
  if ($null -eq $Text) { return 0 }
  return ($Text.ToCharArray() | Where-Object { $_ -eq $Char }).Count
}

function Get-FirstMeaningfulLine {
  param([string[]]$Lines)

  foreach ($line in $Lines) {
    $t = $line.Trim()
    if ($t -eq "") { continue }
    if ($t.StartsWith("//")) { continue }
    if ($t.StartsWith("/*")) { continue }
    return $t
  }

  return ""
}

function Audit-CodeFile {
  param([System.IO.FileInfo]$File)

  $text = Read-Text $File.FullName
  if ($null -eq $text) { return }

  $rel = RelPath $File.FullName
  $lines = [regex]::Split($text, "`r?`n")
  $first = Get-FirstMeaningfulLine $lines
  $isUseClient = $first -match '^["'']use client["''];?$'
  $isTsx = $File.Extension -in @(".tsx", ".jsx")

  $clientish =
    $rel -match "^apps\\app\\app\\" -or
    $rel -match "^apps\\app\\components\\" -or
    $rel -match "^apps\\app\\lib\\" -or
    $rel -match "^packages\\design-system\\" -or
    $rel -match "^packages\\ui\\"

  $depth = 0

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $trim = $line.Trim()
    $lineNo = $i + 1
    $topLevel = $depth -le 0
    $notImport = $trim -notmatch "^(import|export\s+type|type\s|interface\s)"

    if ($clientish -and $topLevel -and $notImport) {
      if ($line -match "\bprocess\.env\b" -and $line -notmatch "=>|function\b") {
        Add-Finding "lazy-loading" "HIGH" $rel $lineNo `
          "process.env read at module load time" `
          $line `
          "Move the env read into a getter/function, or pass it through a runtime-safe wrapper. This is the class of bug that crashes Preview.js before Wrapper.tsx can patch globals."
      }

      if ($line -match "\bprocess\.(cwd|browser|version|versions|platform)\b" -and $line -notmatch "=>|function\b") {
        Add-Finding "lazy-loading" "HIGH" $rel $lineNo `
          "process runtime read at module load time" `
          $line `
          "Move this into server-only code or a lazy function. Client/Preview imports should not need Node globals just to load."
      }

      if ($line -match "\b(window|document|localStorage|sessionStorage|navigator)\b" -and $line -notmatch "typeof\s+(window|document|navigator)" -and $line -notmatch "=>|function\b") {
        Add-Finding "lazy-loading" "HIGH" $rel $lineNo `
          "browser global read at module load time" `
          $line `
          "Move this into useEffect, an event handler, or a function guarded by typeof checks."
      }

      if ($line -match "\b(fetch|apiFetch)\s*\(" -and $line -notmatch "=>|function\b|export\s+const\s+\w+\s*=") {
        Add-Finding "lazy-loading" "HIGH" $rel $lineNo `
          "network call may run during import" `
          $line `
          "Move fetch work into a query hook, server loader, command handler, or explicit function call."
      }
    }

    if ($isUseClient -and $trim -match "from\s+['""](@repo/auth/server|@repo/database|@prisma/client|node:fs|node:path|node:os|node:crypto)['""]") {
      Add-Finding "lazy-loading" "HIGH" $rel $lineNo `
        "client component imports server-only module" `
        $line `
        "Split server-only code out of this client file. Client components should call typed API/client helpers instead."
    }

    if ($clientish -and $trim -match "from\s+['""](node:fs|node:path|node:os|node:crypto)['""]") {
      Add-Finding "lazy-loading" "MEDIUM" $rel $lineNo `
        "client-importable file imports Node module" `
        $line `
        "Keep Node imports in server-only files or inside guarded lazy server branches."
    }

    if ($isTsx -and ($rel -match "^apps\\app\\" -or $rel -match "^packages\\design-system\\")) {
      $rawElementMatches = [regex]::Matches($line, "<(button|input|select|textarea|label|table|thead|tbody|tr|td|th|form)\b(?![^>]*(className=|class=|asChild|hidden|aria-hidden))[^>]*>")
      foreach ($m in $rawElementMatches) {
        Add-Finding "ui-design" "LOW" $rel $lineNo `
          "raw UI primitive without className" `
          $m.Value `
          "Use the design-system component or add explicit styling. These are likely to look like default browser controls in Preview.js."
      }

      if ($line -match "className=\{?\s*['""]\s*['""]\s*\}?") {
        Add-Finding "ui-design" "LOW" $rel $lineNo `
          "empty className" `
          $line `
          "Remove the empty className or apply the intended design-system/Tailwind classes."
      }

      if ($line -match "style=\{\{") {
        Add-Finding "ui-design" "LOW" $rel $lineNo `
          "inline style block" `
          $line `
          "Prefer design tokens/classes unless this is truly dynamic geometry."
      }
    }

    $braceLine = Strip-QuotedText $line
    $depth += (Count-Char $braceLine "{")
    $depth -= (Count-Char $braceLine "}")
    if ($depth -lt 0) { $depth = 0 }
  }
}

function Audit-PreviewSetup {
  $wrapper = Join-Path $ProjectRoot "__previewjs__\Wrapper.tsx"
  $layout = Join-Path $ProjectRoot "apps\app\app\layout.tsx"
  $packageJson = Join-Path $ProjectRoot "package.json"

  if (-not (Test-Path $wrapper)) {
    Add-Finding "preview-setup" "HIGH" "__previewjs__\Wrapper.tsx" 0 `
      "missing Preview.js wrapper" `
      "Wrapper.tsx not found" `
      "Create __previewjs__/Wrapper.tsx and import the same global CSS/providers needed to render app components."
  } else {
    $wrapperText = Read-Text $wrapper
    $cssImports = [regex]::Matches($wrapperText, "import\s+['""]([^'""]+\.css)['""]")

    if ($cssImports.Count -eq 0) {
      Add-Finding "preview-setup" "HIGH" "__previewjs__\Wrapper.tsx" 0 `
        "wrapper imports no CSS" `
        "No .css import found" `
        "Import the real app/global CSS used by apps/app/app/layout.tsx or the design system."
    }

    foreach ($m in $cssImports) {
      $importPath = $m.Groups[1].Value
      $resolved = Resolve-ImportPath $wrapper $importPath
      if ($resolved -and -not (Test-Path $resolved)) {
        Add-Finding "preview-setup" "HIGH" "__previewjs__\Wrapper.tsx" 0 `
          "wrapper CSS import path does not exist" `
          $importPath `
          "Fix the relative CSS path. Missing CSS is why Preview.js can look unstyled."
      }
    }

    if ($wrapperText -notmatch "@previewjs/config-helper-nextjs") {
      Add-Finding "preview-setup" "MEDIUM" "__previewjs__\Wrapper.tsx" 0 `
        "Next.js Preview helper not imported" `
        "Missing @previewjs/config-helper-nextjs" `
        "Import the helper unless you intentionally maintain manual mocks for Next image/router behavior."
    }

    if ($wrapperText -match "process\.env" -and $wrapperText -notmatch "globalThis\.process") {
      Add-Finding "preview-setup" "MEDIUM" "__previewjs__\Wrapper.tsx" 0 `
        "wrapper references process.env but may not define process" `
        "process.env found without globalThis.process setup" `
        "Define globalThis.process before imports, or avoid relying on process.env in Preview.js."
    }

    if (Test-Path $layout) {
      $layoutText = Read-Text $layout
      $layoutCssImports = [regex]::Matches($layoutText, "import\s+['""]([^'""]+\.css)['""]")
      foreach ($m in $layoutCssImports) {
        $layoutCss = Split-Path -Leaf $m.Groups[1].Value
        if ($wrapperText -notmatch [regex]::Escape($layoutCss)) {
          Add-Finding "preview-setup" "MEDIUM" "__previewjs__\Wrapper.tsx" 0 `
            "wrapper may not import layout CSS" `
            "layout imports $($m.Groups[1].Value), wrapper does not mention $layoutCss" `
            "Preview should import the same global/design CSS as the real app shell."
        }
      }

      $providerNames = @(
        "ClerkProvider",
        "ThemeProvider",
        "QueryClientProvider",
        "TooltipProvider",
        "Toaster",
        "DesignSystemProvider"
      )

      foreach ($provider in $providerNames) {
        if ($layoutText -match $provider -and $wrapperText -notmatch $provider) {
          Add-Finding "preview-setup" "MEDIUM" "__previewjs__\Wrapper.tsx" 0 `
            "wrapper may not mirror app provider" `
            "$provider appears in layout but not Wrapper.tsx" `
            "Add a lightweight/safe version of this provider to Preview.js if components depend on it for styling or behavior."
        }
      }
    }
  }

  $previewConfigDocsName = Get-ChildItem -LiteralPath $ProjectRoot -File -Filter "preview.config.*" -ErrorAction SilentlyContinue
  $previewConfigOtherName = Get-ChildItem -LiteralPath $ProjectRoot -File -Filter "previewjs.config.*" -ErrorAction SilentlyContinue

  if ($previewConfigDocsName.Count -eq 0 -and $previewConfigOtherName.Count -gt 0) {
    Add-Finding "preview-setup" "MEDIUM" (RelPath $previewConfigOtherName[0].FullName) 0 `
      "Preview config filename may be wrong" `
      "Found previewjs.config.* but not preview.config.*" `
      "Verify Preview.js is actually reading this file. Current docs describe preview.config.js next to package.json."
  }

  if (Test-Path $packageJson) {
    $pkg = Read-Text $packageJson
    if ((Test-Path $wrapper) -and (Read-Text $wrapper) -match "@previewjs/config-helper-nextjs" -and $pkg -notmatch "@previewjs/config-helper-nextjs") {
      Add-Finding "preview-setup" "HIGH" "package.json" 0 `
        "missing Preview.js Next helper dependency" `
        "Wrapper imports @previewjs/config-helper-nextjs but package.json does not mention it" `
        "Install it at the workspace root or remove the import and use manual mocks."
    }
  }
}

function Build-Report {
  $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $lines = New-Object System.Collections.Generic.List[string]

  $lines.Add("Capsule-Pro lazy-loading + UI design audit")
  $lines.Add("Generated: $now")
  $lines.Add("Project: $ProjectRoot")
  $lines.Add("")
  $lines.Add("What this catches:")
  $lines.Add("- HIGH lazy-loading findings: likely Preview.js/runtime crash risks caused by import-time Node/browser/env reads.")
  $lines.Add("- MEDIUM preview findings: likely visual parity gaps between Preview.js and the real app.")
  $lines.Add("- LOW UI findings: raw controls or styling patterns that often render like unstyled browser defaults.")
  $lines.Add("")

  if ($Findings.Count -eq 0) {
    $lines.Add("No findings detected by static heuristics.")
    return $lines
  }

  $summary = $Findings | Group-Object Severity, Category | Sort-Object Name
  $lines.Add("Summary:")
  foreach ($g in $summary) {
    $lines.Add(("- {0}: {1}" -f $g.Name, $g.Count))
  }
  $lines.Add("")

  $highs = ($Findings | Where-Object { $_.Severity -eq "HIGH" }).Count
  $mediums = ($Findings | Where-Object { $_.Severity -eq "MEDIUM" }).Count
  $lows = ($Findings | Where-Object { $_.Severity -eq "LOW" }).Count

  $lines.Add("Product impact:")
  if ($highs -gt 0) {
    $lines.Add("- $highs high-risk issue(s): these can make Preview.js or browser rendering fail before the page appears.")
  }
  if ($mediums -gt 0) {
    $lines.Add("- $mediums preview parity issue(s): these can make Preview.js look different from the real app, especially missing CSS/providers.")
  }
  if ($lows -gt 0) {
    $lines.Add("- $lows UI consistency issue(s): these can make controls look raw, inconsistent, or hard to judge visually.")
  }
  $lines.Add("")

  $sorted = $Findings | Sort-Object @{ Expression = { Get-Rank $_.Severity } }, Category, File, Line

  $lines.Add("Findings:")
  foreach ($f in $sorted) {
    $loc = $f.File
    if ($f.Line -gt 0) { $loc = "$loc`:$($f.Line)" }

    $lines.Add("")
    $lines.Add("[$($f.Severity)] [$($f.Category)] $loc")
    $lines.Add("Rule: $($f.Rule)")
    if ($f.Evidence) { $lines.Add("Evidence: $($f.Evidence)") }
    $lines.Add("Fix: $($f.Fix)")
  }

  $lines.Add("")
  $lines.Add("Notes:")
  $lines.Add("- This is a static audit. It intentionally over-flags some cases so you can inspect them before changing code.")
  $lines.Add("- Fix shared client-importable modules first. One unsafe shared import can break many Preview.js pages.")
  $lines.Add("- Preview.js visual parity usually depends on Wrapper.tsx importing real global CSS and safe versions of app providers.")

  return $lines
}

if (-not (Test-Path $ProjectRoot)) {
  "Project root not found: $ProjectRoot" | Set-Content -LiteralPath $OutFile -Encoding UTF8
  throw "Project root not found: $ProjectRoot"
}

"Starting audit: $ProjectRoot" | Set-Content -LiteralPath $OutFile -Encoding UTF8

Audit-PreviewSetup

$files = Get-CodeFiles
foreach ($file in $files) {
  Audit-CodeFile $file
}

$report = Build-Report
$report | Set-Content -LiteralPath $OutFile -Encoding UTF8

Write-Host "Audit complete."
Write-Host "Files scanned: $($files.Count)"
Write-Host "Findings: $($Findings.Count)"
Write-Host "Report: $OutFile"
