import { execSync } from "node:child_process";

const DEFAULT_DEBUG_PORT = 9222;
const DEFAULT_HOST = "127.0.0.1";

/**
 * Detects the WebSocket endpoint from Chrome's remote debugging protocol.
 * Fetches from http://127.0.0.1:9222/json/version and extracts webSocketDebuggerUrl.
 * Uses PowerShell on Windows (curl often missing or aliased) and curl elsewhere.
 */
export function detectBrowserEndpoint(
  debugPort = DEFAULT_DEBUG_PORT,
  host = DEFAULT_HOST
): string | null {
  const url = `http://${host}:${debugPort}/json/version`;
  let raw: string;
  try {
    if (process.platform === "win32") {
      raw = execSync(
        `powershell -NoProfile -Command "(Invoke-WebRequest -Uri '${url}' -UseBasicParsing -TimeoutSec 5).Content"`,
        { encoding: "utf-8", timeout: 8000 }
      );
    } else {
      raw = execSync(`curl -s "${url}"`, {
        encoding: "utf-8",
        timeout: 5000,
      });
    }
    const parsed = JSON.parse(raw.trim());
    return parsed.webSocketDebuggerUrl ?? null;
  } catch {
    return null;
  }
}
