import { Ratelimit, type RatelimitConfig } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { keys } from "./keys";

let _redis: Redis | null = null;
let _missingLogged = false;

/**
 * Lazily create the Redis client. Returns null when credentials are missing.
 * In production, missing credentials is a fatal misconfiguration.
 * In development, we log once and return null so callers can fall back.
 */
function getRedis(): Redis | null {
  if (_redis) {
    return _redis;
  }

  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = keys();

  if (!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)) {
    if (!_missingLogged) {
      _missingLogged = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[@repo/rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. " +
          "Rate limiting is disabled. Set these env vars to enable rate limiting."
      );
    }
    return null;
  }

  _redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });

  return _redis;
}

/**
 * Create a rate limiter backed by Upstash Redis.
 *
 * When Redis credentials are missing (common in local dev without Infisical),
 * returns a passthrough limiter that always allows the request.
 * In production, missing credentials should be treated as a misconfiguration —
 * the fail-closed behavior in global-rate-limit.ts handles that.
 */
export const createRateLimiter = (props: Omit<RatelimitConfig, "redis">) => {
  const client = getRedis();

  if (!client) {
    // No Redis available — return a passthrough that always succeeds.
    return {
      limit: async (key: string) => ({
        success: true as const,
        remaining: 100,
        limit: 100,
        reset: new Date(),
        pending: Promise.resolve([]),
      }),
    };
  }

  return new Ratelimit({
    redis: client,
    limiter: props.limiter ?? Ratelimit.slidingWindow(10, "10 s"),
    prefix: props.prefix ?? "next-forge",
  });
};

export const { slidingWindow } = Ratelimit;
