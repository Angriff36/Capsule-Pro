/**
 * Rate Limiting Middleware
 *
 * Enforces configurable rate limits per endpoint using Upstash Redis.
 * Supports per-tenant, per-endpoint, and per-user rate limiting.
 *
 * Usage:
 *   import { checkRateLimit, withRateLimit } from "@/middleware/rate-limiter";
 *
 *   // Direct check
 *   const result = await checkRateLimit(request, tenantId);
 *   if (!result.success) {
 *     return result.response; // 429 Response with headers
 *   }
 *
 *   // Higher-order function wrapper
 *   export const GET = withRateLimit(async (request, context) => {
 *     // Your handler logic here
 *   }, { limit: 100, window: "1m" });
 */

import { database } from "@repo/database";
import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { NextResponse } from "next/server";

// ============================================================================
// Types
// ============================================================================

/**
 * Rate limit configuration options.
 */
export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit?: number;
  /** Time window (e.g., "1m", "1h", "1d") */
  window?: string;
  /** Key prefix for Redis (default: "rate_limit") */
  prefix?: string;
  /** Whether to skip rate limiting (useful for testing) */
  skip?: boolean;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  response?: Response;
}

/**
 * Context passed to handlers wrapped with withRateLimit.
 */
export interface RateLimitContext {
  rateLimit: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW = "1m";
const DEFAULT_PREFIX = "rate_limit";

// Window string to milliseconds conversion
const WINDOW_PARSERS: Record<string, (value: number) => number> = {
  s: (v) => v * 1000,
  m: (v) => v * 60 * 1000,
  h: (v) => v * 60 * 60 * 1000,
  d: (v) => v * 24 * 60 * 60 * 1000,
};

// Window string unit names for Duration format
const WINDOW_UNITS: Record<string, string> = {
  s: "s",
  m: "m",
  h: "h",
  d: "d",
};

/**
 * Duration type from @upstash/ratelimit
 * Format: "${number} ${unit}" or "${number}${unit}"
 */
type Duration = `${number} ${"s" | "m" | "h" | "d"}` | `${number}${"s" | "m" | "h" | "d"}`;

/**
 * Converts milliseconds to Duration string format for Upstash.
 * @param windowMs - Time window in milliseconds
 * @returns Duration string like "1 m", "10 s", etc.
 */
function msToDuration(windowMs: number): Duration {
  // Find the largest unit that divides evenly
  if (windowMs % 86400000 === 0) {
    return `${windowMs / 86400000} d`;
  }
  if (windowMs % 3600000 === 0) {
    return `${windowMs / 3600000} h`;
  }
  if (windowMs % 60000 === 0) {
    return `${windowMs / 60000} m`;
  }
  return `${windowMs / 1000} s`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parses a window string (e.g., "1m", "1h", "1d") to milliseconds.
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}. Use format like "1m", "1h", "1d"`);
  }
  const [, value, unit] = match;
  const parser = WINDOW_PARSERS[unit];
  if (!parser) {
    throw new Error(`Unknown time unit: ${unit}`);
  }
  return parser(Number.parseInt(value, 10));
}

/**
 * Extracts client identifier from request.
 * Priority: user ID > API key ID > IP address
 */
function extractIdentifier(request: Request): string {
  // Try to get user ID from headers (set by auth middleware)
  const userId = request.headers.get("x-user-id");
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get API key ID
  const apiKeyId = request.headers.get("x-api-key-id");
  if (apiKeyId) {
    return `apikey:${apiKeyId}`;
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Extracts endpoint pattern from request URL.
 */
function extractEndpoint(url: string, method: string): string {
  const parsedUrl = new URL(url);
  // Replace UUIDs with placeholder for pattern matching
  const path = parsedUrl.pathname.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ":id"
  );
  return `${method}:${path}`;
}

/**
 * Creates a 429 Too Many Requests response with rate limit headers.
 */
function createRateLimitedResponse(
  limit: number,
  remaining: number,
  reset: Date,
  retryAfter?: number
): Response {
  const headers = new Headers({
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-reset": reset.toISOString(),
    "retry-after": String(retryAfter ?? Math.ceil((reset.getTime() - Date.now()) / 1000)),
  });

  return NextResponse.json(
    {
      message: "Too many requests. Please try again later.",
      limit,
      remaining,
      reset: reset.toISOString(),
    },
    { status: 429, headers }
  );
}

/**
 * Adds rate limit headers to a response.
 */
export function addRateLimitHeaders(
  response: Response,
  limit: number,
  remaining: number,
  reset: Date
): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("x-ratelimit-limit", String(limit));
  newHeaders.set("x-ratelimit-remaining", String(Math.max(0, remaining)));
  newHeaders.set("x-ratelimit-reset", reset.toISOString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ============================================================================
// Rate Limit Functions
// ============================================================================

/**
 * Looks up rate limit configuration for an endpoint.
 * Returns tenant-specific config or falls back to defaults.
 */
async function getRateLimitConfig(
  tenantId: string,
  endpoint: string
): Promise<{ limit: number; windowMs: number } | null> {
  try {
    const configs = await database.rateLimitConfig.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        priority: "desc",
      },
    });

    // Find first matching config
    for (const config of configs) {
      const regex = new RegExp(config.endpointPattern, "i");
      if (regex.test(endpoint)) {
        return {
          limit: config.maxRequests,
          windowMs: config.windowMs,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("[rate-limiter] Failed to lookup rate limit config:", error);
    return null;
  }
}

/**
 * Logs a rate limit event to the database.
 * Non-blocking fire-and-forget.
 */
function logRateLimitEvent(
  tenantId: string,
  endpoint: string,
  method: string,
  allowed: boolean,
  limit: number,
  requestsInWindow: number,
  request: Request,
  windowStart: Date,
  windowEnd: Date
): void {
  const userId = request.headers.get("x-user-id");
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();

  // Hash IP for privacy
  const ipHash = ip
    ? require("crypto").createHash("sha256").update(ip).digest("hex").slice(0, 32)
    : null;

  database.rateLimitEvent
    .create({
      data: {
        tenantId,
        endpoint,
        method,
        allowed,
        windowStart,
        windowEnd,
        requestsInWindow,
        limit,
        userId,
        userAgent,
        ipHash,
      },
    })
    .catch((error) => {
      console.error("[rate-limiter] Failed to log rate limit event:", error);
    });
}

/**
 * Checks rate limit for a request.
 *
 * @param request - The incoming request
 * @param tenantId - The tenant ID for configuration lookup
 * @param options - Optional rate limit configuration override
 * @returns Rate limit result with headers and optional 429 response
 *
 * @example
 * const result = await checkRateLimit(request, tenantId);
 * if (!result.success) {
 *   return result.response; // 429 Response
 * }
 * // Continue with handler
 */
export async function checkRateLimit(
  request: Request,
  tenantId: string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  // Skip if explicitly disabled or Redis not configured
  if (options?.skip) {
    return {
      success: true,
      limit: options.limit ?? DEFAULT_LIMIT,
      remaining: options.limit ?? DEFAULT_LIMIT,
      reset: new Date(Date.now() + parseWindow(options.window ?? DEFAULT_WINDOW)),
    };
  }

  const endpoint = extractEndpoint(request.url, request.method);
  const identifier = extractIdentifier(request);

  // Get configuration: options > tenant config > defaults
  let limit = options?.limit ?? DEFAULT_LIMIT;
  let windowMs: number;

  if (options?.limit && options?.window) {
    windowMs = parseWindow(options.window);
  } else {
    const config = await getRateLimitConfig(tenantId, endpoint);
    if (config) {
      limit = config.limit;
      windowMs = config.windowMs;
    } else {
      windowMs = parseWindow(options?.window ?? DEFAULT_WINDOW);
    }
  }

  // Create rate limiter with Upstash Redis
  const prefix = options?.prefix ?? DEFAULT_PREFIX;
  const windowDuration = msToDuration(windowMs);
  const rateLimiter = createRateLimiter({
    limiter: slidingWindow(limit, windowDuration),
    prefix: `${prefix}:${tenantId}`,
  });

  // Check rate limit
  const key = `${endpoint}:${identifier}`;
  const startTime = Date.now();

  try {
    const { success, remaining, reset } = await rateLimiter.limit(key);
    const resetDate = new Date(reset);

    // Log event (non-blocking)
    const windowStart = new Date(resetDate.getTime() - windowMs);
    logRateLimitEvent(
      tenantId,
      endpoint,
      request.method,
      success,
      limit,
      limit - remaining,
      request,
      windowStart,
      resetDate
    );

    if (!success) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetDate,
        response: createRateLimitedResponse(limit, 0, resetDate),
      };
    }

    return {
      success: true,
      limit,
      remaining,
      reset: resetDate,
    };
  } catch (error) {
    // On Redis error, allow the request (fail open)
    console.error("[rate-limiter] Redis error, allowing request:", error);
    return {
      success: true,
      limit,
      remaining: limit,
      reset: new Date(Date.now() + windowMs),
    };
  }
}

// ============================================================================
// Higher-Order Function
// ============================================================================

/**
 * Wraps an API route handler with rate limiting.
 *
 * @param handler - The route handler to wrap
 * @param options - Rate limit configuration options
 * @returns A wrapped handler that checks rate limits before calling the original
 *
 * @example
 * // With default limits (100 requests per minute)
 * export const GET = withRateLimit(async (request, context) => {
 *   return NextResponse.json({ data: "..." });
 * });
 *
 * @example
 * // With custom limits
 * export const POST = withRateLimit(
 *   async (request, context) => {
 *     return NextResponse.json({ data: "..." });
 *   },
 *   { limit: 10, window: "1h" } // 10 requests per hour
 * );
 */
export function withRateLimit<TParams = Record<string, string | string[]>>(
  handler: (
    request: Request,
    context: RateLimitContext & { params?: Promise<TParams> }
  ) => Promise<Response>,
  options?: RateLimitOptions
): (request: Request, context?: { params?: Promise<TParams> }) => Promise<Response> {
  return async (
    request: Request,
    context?: { params?: Promise<TParams> }
  ): Promise<Response> => {
    // Get tenant ID from headers (set by auth middleware)
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      // No tenant ID - skip rate limiting (handler will handle auth)
      return handler(request, {
        rateLimit: {
          limit: options?.limit ?? DEFAULT_LIMIT,
          remaining: options?.limit ?? DEFAULT_LIMIT,
          reset: new Date(Date.now() + parseWindow(options?.window ?? DEFAULT_WINDOW)),
        },
        params: context?.params,
      } as RateLimitContext & { params?: Promise<TParams> });
    }

    const result = await checkRateLimit(request, tenantId, options);

    if (!result.success && result.response) {
      return result.response;
    }

    const response = await handler(request, {
      rateLimit: {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
      params: context?.params,
    } as RateLimitContext & { params?: Promise<TParams> });

    // Add rate limit headers to response
    return addRateLimitHeaders(response, result.limit, result.remaining, result.reset);
  };
}

// ============================================================================
// Combined Middleware (Auth + Rate Limit)
// ============================================================================

/**
 * Wraps an API route handler with both API key authentication and rate limiting.
 *
 * @param handler - The route handler to wrap
 * @param options - Rate limit configuration options
 * @returns A wrapped handler with both auth and rate limiting
 *
 * @example
 * import { withApiKeyAuthAndRateLimit } from "@/middleware/rate-limiter";
 * import { ApiKeyHandlerContext } from "@/middleware/api-key-auth";
 *
 * export const GET = withApiKeyAuthAndRateLimit(
 *   async (request, context) => {
 *     const { apiKey, rateLimit } = context;
 *     // ...
 *   },
 *   { limit: 100, window: "1m" }
 * );
 */
export function withApiKeyAuthAndRateLimit<TParams = Record<string, string | string[]>>(
  handler: (
    request: Request,
    context: RateLimitContext & { params?: TParams; apiKey?: unknown }
  ) => Promise<Response>,
  options?: RateLimitOptions
): (request: Request, context?: { params?: TParams }) => Promise<Response> {
  // Import here to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { authenticateApiKey } = require("./api-key-auth");

  return async (
    request: Request,
    context?: { params?: TParams }
  ): Promise<Response> => {
    // First, try API key auth
    const authResult = await authenticateApiKey(request);

    let tenantId: string;
    let apiKeyContext: unknown;

    if (authResult.success) {
      tenantId = authResult.apiKey.tenantId;
      apiKeyContext = authResult.apiKey;
    } else {
      // Fall back to session-based tenant ID
      const headerTenantId = request.headers.get("x-tenant-id");
      if (!headerTenantId) {
        // No authentication - let handler deal with it
        return handler(request, {
          rateLimit: {
            limit: options?.limit ?? DEFAULT_LIMIT,
            remaining: options?.limit ?? DEFAULT_LIMIT,
            reset: new Date(Date.now() + parseWindow(options?.window ?? DEFAULT_WINDOW)),
          },
          params: context?.params,
        } as RateLimitContext & { params?: TParams });
      }
      tenantId = headerTenantId;
    }

    // Check rate limit
    const result = await checkRateLimit(request, tenantId, options);

    if (!result.success && result.response) {
      return result.response;
    }

    const response = await handler(request, {
      rateLimit: {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
      apiKey: apiKeyContext,
      params: context?.params,
    } as RateLimitContext & { params?: TParams });

    return addRateLimitHeaders(response, result.limit, result.remaining, result.reset);
  };
}
