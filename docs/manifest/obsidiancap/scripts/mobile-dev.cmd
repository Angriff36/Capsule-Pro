@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

echo [mobile-dev] Cleaning stale listeners on 8081/19000/19001...
for %%P in (8081 19000 19001) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    taskkill /F /PID %%A >nul 2>&1
  )
)

echo [mobile-dev] Resetting adb and port reverse...
adb kill-server >nul 2>&1
adb start-server >nul 2>&1
adb reconnect offline >nul 2>&1

set DEVICE=
for /f "tokens=1,2" %%A in ('adb devices ^| findstr /R /C:"emulator-[0-9][0-9]*"') do (
  if "%%B"=="device" set DEVICE=%%A
)

if defined DEVICE (
  echo [mobile-dev] Online emulator detected: !DEVICE!
  adb -s !DEVICE! reverse tcp:8081 tcp:8081 >nul 2>&1
  adb -s !DEVICE! reverse tcp:19000 tcp:19000 >nul 2>&1
  adb -s !DEVICE! reverse tcp:19001 tcp:19001 >nul 2>&1
) else (
  echo [mobile-dev] No online emulator found. Start emulator first, then open Expo Go.
)

echo [mobile-dev] Starting Expo (stable mode, no auto-open)...
pnpm --filter mobile exec expo start --clear --port 8081

endlocal
