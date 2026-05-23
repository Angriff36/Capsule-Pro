@echo off
setlocal
cd /d "%~dp0\.."

echo [dev-mobile-stack] Starting API in new window...
start "capsule-api" cmd /k "cd /d %CD% && pnpm --filter ./apps/api dev"

echo [dev-mobile-stack] Starting web app in new window...
start "capsule-app" cmd /k "cd /d %CD% && pnpm --filter ./apps/app dev"

echo [dev-mobile-stack] Starting mobile in this window...
call scripts\mobile-dev.cmd

endlocal
