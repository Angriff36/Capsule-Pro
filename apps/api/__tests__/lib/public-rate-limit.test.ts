/**
 * public-rate-limit.ts test suite
 *
 * Public mutation endpoints (contract signing, proposal responses) bypass the
 * authenticated/global rate limiter because they have no tenant identity at
 * call time. This IP-based limiter prevents abuse and resource exhaustion.
 *
 * Behaviors verified:
 *  - Allowed requests return null (handler proceeds normally)
 *  - Throttled requests return a 429 NextResponse with rate-limit headers
 *  - Redis failures fail open (returning null) so a Redis outage cannot break
 *    legitimate signing/responding flows
 *  - Bucket key derivation pulls the client IP from proxy headers and
 *    normalizes dynamic URL segments (UUIDs/long tokens) so shared endpoints
 *    share a bucket per IP
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above all imports, so the mock object must be
// declared via vi.hoisted to be available when the factory runs.
const { mockRateLimiter } = vi.hoisted(() => ({
  mockRateLimiter: { limit: vi.fn() },
}));

vi.mock("@repo/rate-limit", () => ({
  createRateLimiter: vi.fn(() => mockRateLimiter),
  slidingWindow: vi.fn((limit: number, window: string) => ({ limit, window })),
}));

// Import AFTER vi.mock is registered so the module receives the mocked dependency.
import { checkPublicRateLimit } from "../../lib/public-rate-limit";

const SIGN_URL =
  "http://localhost:3000/api/public/contracts/abcdef12-3456-7890-abcd-ef1234567890/sign";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request(SIGN_URL, {
    method: "POST",
    headers,
  });
}

describe("checkPublicRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when the request is under the limit", async () => {
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    const response = await checkPublicRateLimit(makeRequest());
    expect(response).toBeNull();
    expect(mockRateLimiter.limit).toHaveBeenCalledTimes(1);
  });

  it("returns a 429 response when throttled", async () => {
    const reset = Date.now() + 60_000;
    mockRateLimiter.limit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset,
    });

    const response = await checkPublicRateLimit(makeRequest());
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);

    const body = await response?.json();
    expect(body).toEqual({
      message: "Too many requests. Please try again later.",
    });

    // Headers help clients implement client-side backoff.
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(response?.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response?.headers.get("X-RateLimit-Reset")).toBe(
      new Date(reset).toISOString()
    );
    expect(response?.headers.get("Retry-After")).toBe("60");
  });

  it("fails open (returns null) when the limiter throws", async () => {
    // Redis outage must NOT block legitimate signers/responders.
    mockRateLimiter.limit.mockRejectedValue(new Error("redis down"));

    const response = await checkPublicRateLimit(makeRequest());
    expect(response).toBeNull();
  });

  it("uses x-forwarded-for first IP as the bucket identity", async () => {
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    await checkPublicRateLimit(
      makeRequest({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })
    );

    const key = mockRateLimiter.limit.mock.calls[0]?.[0] as string;
    expect(key.startsWith("203.0.113.5:")).toBe(true);
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", async () => {
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    await checkPublicRateLimit(makeRequest({ "x-real-ip": "198.51.100.7" }));

    const key = mockRateLimiter.limit.mock.calls[0]?.[0] as string;
    expect(key.startsWith("198.51.100.7:")).toBe(true);
  });

  it("falls back to 'unknown' when no proxy headers are present", async () => {
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    await checkPublicRateLimit(makeRequest());

    const key = mockRateLimiter.limit.mock.calls[0]?.[0] as string;
    expect(key.startsWith("unknown:")).toBe(true);
  });

  it("normalizes dynamic URL segments to share a bucket across IDs", async () => {
    // Two different signing tokens must hit the same bucket per IP, otherwise
    // an attacker could cycle tokens to evade the limit.
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    const headers = { "x-forwarded-for": "203.0.113.5" };

    const reqA = new Request(
      "http://localhost:3000/api/public/contracts/aaaaaaaa-1111-2222-3333-444444444444/sign",
      { method: "POST", headers }
    );
    const reqB = new Request(
      "http://localhost:3000/api/public/contracts/bbbbbbbb-5555-6666-7777-888888888888/sign",
      { method: "POST", headers }
    );

    await checkPublicRateLimit(reqA);
    await checkPublicRateLimit(reqB);

    const keyA = mockRateLimiter.limit.mock.calls[0]?.[0] as string;
    const keyB = mockRateLimiter.limit.mock.calls[1]?.[0] as string;
    expect(keyA).toBe(keyB);
  });

  it("includes the HTTP method in the bucket so GET vs POST do not share a bucket", async () => {
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    const headers = { "x-forwarded-for": "203.0.113.5" };
    const reqGet = new Request(SIGN_URL, { method: "GET", headers });
    const reqPost = new Request(SIGN_URL, { method: "POST", headers });

    await checkPublicRateLimit(reqGet);
    await checkPublicRateLimit(reqPost);

    const keyGet = mockRateLimiter.limit.mock.calls[0]?.[0] as string;
    const keyPost = mockRateLimiter.limit.mock.calls[1]?.[0] as string;
    expect(keyGet).not.toBe(keyPost);
    expect(keyGet).toContain("GET:");
    expect(keyPost).toContain("POST:");
  });
});
