# PowerShell setup script for Windows

$ManifestRepo = "..\..\Manifest"
$PackageDir = Get-Location

Write-Host "Setting up @repo/manifest package..." -ForegroundColor Cyan

# Check if Manifest repo exists
if (-not (Test-Path $ManifestRepo)) {
    Write-Host "❌ Manifest repo not found at $ManifestRepo" -ForegroundColor Red
    Write-Host "   Please ensure Manifest is cloned at: $(Split-Path (Split-Path $PackageDir)))\Manifest" -ForegroundColor Yellow
    exit 1
}

# Copy source files
Write-Host "📦 Copying Manifest source files..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "$PackageDir\src\manifest" | Out-Null
Copy-Item -Path "$ManifestRepo\src\manifest\*" -Destination "$PackageDir\src\manifest\" -Recurse -Force

# Update index.ts
Write-Host "📝 Updating index.ts..." -ForegroundColor Cyan
@"
/**
 * @repo/manifest
 * 
 * Manifest Language Runtime and Compiler
 */

export * from './manifest/runtime-engine';
export * from './manifest/ir-compiler';
export type * from './manifest/ir';
"@ | Out-File -FilePath "$PackageDir\src\index.ts" -Encoding utf8

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd ..\.."
Write-Host "  2. pnpm install"
Write-Host "  3. cd packages\manifest"
Write-Host "  4. pnpm build"
Write-Host ""
Write-Host "Then use in your code:" -ForegroundColor Cyan
Write-Host "  import { RuntimeEngine, compileToIR } from '@repo/manifest';"
