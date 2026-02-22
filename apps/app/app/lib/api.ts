/**
 * API Client — Central fetch wrapper for all client-to-API communication.
 *
 * IMPORTANT: Do not hardcode "/api/..." paths in UI code. Instead, import
 * route helpers from `@/lib/routes` and pass the result to `apiFetch()`.
 *
 * Example:
 *   import { kitchenRecipeVersions } from "@/lib/routes";
 *   const res = await apiFetch(kitchenRecipeVersions(recipeId));
 *
 * In development mode, apiFetch validates that the requested path matches a
 * known route from routes.manifest.json. Unknown paths throw immediately so
 * you catch stale/typo'd endpoints early.
 */

const DEFAULT_API_BASE_URL = "http://127.0.0.1:2223";

const TRAILING_SLASH_RE = /\/$/;

const normalizeBaseUrl = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }
  return value.replace(TRAILING_SLASH_RE, "");
};

const resolvedApiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export const getApiBaseUrl = (): string => {
  // On the client, we MUST return an empty string to use the Next.js rewrite proxy.
  // This avoids CORS issues and ensures session cookies are shared correctly.
  if (typeof window !== "undefined") {
    return "";
  }

  if (resolvedApiBaseUrl) {
    return resolvedApiBaseUrl;
  }

  return DEFAULT_API_BASE_URL;
};

export const apiUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${baseUrl}${path}`;
  }

  return `${baseUrl}/${path}`;
};

// ---------------------------------------------------------------------------
// Dev-time route validation
// ---------------------------------------------------------------------------

interface RouteManifest {
  routes: Array<{ path: string }>;
}

/**
 * Build a set of route patterns from the generated manifest for O(1) lookups.
 * Patterns use `:param` placeholders; we convert the requested path to match.
 *
 * The manifest is loaded lazily and only in development mode. In production
 * this code is dead-code-eliminated by the bundler.
 */
let _knownPatterns: Set<string> | null = null;
let _manifestLoaded = false;

function getKnownPatterns(): Set<string> {
  if (_knownPatterns) {
    return _knownPatterns;
  }
  if (_manifestLoaded) {
    // Already tried and failed — return empty set
    return new Set();
  }
  _manifestLoaded = true;

  try {
    // Dynamic require so this is tree-shaken in production builds.
    // The manifest JSON lives at the repo root relative path.
    // In server context (SSR/dev), we can read it from disk.
    if (typeof window === "undefined") {
      // Server-side: read from filesystem
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("node:path");
      const manifestPath = path.resolve(
        process.cwd(),
        "packages/manifest-ir/dist/routes.manifest.json"
      );
      if (fs.existsSync(manifestPath)) {
        const manifest: RouteManifest = JSON.parse(
          fs.readFileSync(manifestPath, "utf-8")
        );
        _knownPatterns = new Set(
          manifest.routes.map((r: { path: string }) => r.path)
        );
        return _knownPatterns;
      }
    }
    // Client-side: skip validation (manifest not available in browser bundle)
    _knownPatterns = new Set();
    return _knownPatterns;
  } catch (err) {
    console.warn(
      "[apiFetch] Could not load route manifest for dev validation:",
      err
    );
    _knownPatterns = new Set();
    return _knownPatterns;
  }
}

/**
 * Check whether a concrete path like `/api/kitchen/recipes/abc-123/versions`
 * matches any known route pattern like `/api/kitchen/recipes/:recipeId/versions`.
 */
function matchesKnownRoute(path: string): boolean {
  // Strip query string for matching
  const pathOnly = path.split("?")[0];
  const patterns = getKnownPatterns();

  if (patterns.size === 0) {
    return true; // No manifest loaded — skip validation
  }

  // Direct match (no params)
  if (patterns.has(pathOnly)) {
    return true;
  }

  // Try to match against parameterised patterns
  const segments = pathOnly.split("/");
  for (const pattern of patterns) {
    const patternSegments = pattern.split("/");
    if (patternSegments.length !== segments.length) {
      continue;
    }
    let match = true;
    for (let i = 0; i < patternSegments.length; i++) {
      const ps = patternSegments[i];
      if (ps.startsWith(":")) {
        continue; // Param segment — matches anything
      }
      if (ps !== segments[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return true;
    }
  }

  return false;
}

function validateRoute(path: string): void {
  if (!path.startsWith("/api/")) {
    return; // Not an API path, skip validation
  }
  if (!matchesKnownRoute(path)) {
    const suggestion =
      "Use a route helper from @/lib/routes instead of hardcoding paths.";
    console.error(
      `[apiFetch] Unknown API route: "${path}". ${suggestion}\n` +
        "  Run: node scripts/manifest/generate-route-manifest.mjs to regenerate the manifest."
    );
    throw new Error(`[apiFetch] Unknown API route: "${path}". ${suggestion}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const apiFetch = (
  path: string,
  init?: RequestInit
): Promise<Response> => {
  // Dev-time guard: validate path against known routes
  if (process.env.NODE_ENV === "development") {
    validateRoute(path);
  }

  return fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });
};
