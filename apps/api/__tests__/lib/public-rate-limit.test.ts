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

// vi.mock factories are hoisted above all imports. We capture both the public
// and webhook limiter instances so the assertions below can verify which
// limiter (and which sliding-window threshold) each helper uses.
const { mockPublicLimiter, mockWebhookLimiter, slidingWindowSpy } = vi.hoisted(
  () => ({
    mockPublicLimiter: { limit: vi.fn() },
    mockWebhookLimiter: { limit: vi.fn() },
    slidingWindowSpy: vi.fn((limit: number, window: string) => ({
      limit,
      window,
    })),
  })
);

vi.mock("@repo/rate-limit", () => ({
  createRateLimiter: vi.fn(({ prefix }: { prefix: string }) =>
    prefix === "webhook_rate_limit" ? mockWebhookLimiter : mockPublicLimiter
  ),
  slidingWindow: slidingWindowSpy,
}));

// Import AFTER vi.mock is registered so the module receives the mocked dependency.
import {
  checkPublicRateLimit,
  checkWebhookRateLimit,
} from "../../lib/public-rate-limit";

// Snapshot the slidingWindow construction calls now: each test's beforeEach
// runs vi.clearAllMocks(), but the limiters were already built at module load.
const slidingWindowConstructionCalls = slidingWindowSpy.mock.calls.map(
  ([limit, window]) => `${limit}/${window}`
);

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
    mockPublicLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    const response = await checkPublicRateLimit(makeRequest());
    expect(response).toBeNull();
    expect(mockPublicLimiter.limit).toHaveBeenCalledTimes(1);
  });

  it("returns a 429 response when throttled", async () => {
    const reset = Date.now() + 60_000;
    mockPublicLimiter.limit.mockResolvedValue({
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
    mockPublicLimiter.limit.mockRejectedValue(new Error("redis down"));

    const response = await checkPublicRateLimit(makeRequest());
    expect(response).toBeNull();
  });

  it("uses x-forwarded-for first IP as the bucket identity", async () => {
    mockPublicLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    await checkPublicRateLimit(
      makeRequest({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })
    );

    const key = mockPublicLimiter.limit.mock.calls[0]?.[0] as string;
    expect(key.startsWith("203.0.113.5:")).toBe(true);
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", async () => {
    mockPublicLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    await checkPublicRateLimit(makeRequest({ "x-real-ip": "198.51.100.7" }));

    const key = mockPublicLimiter.limit.mock.calls[0]?.[0] as string;
    expect(key.startsWith("198.51.100.7:")).toBe(true);
  });

  it("falls back to 'unknown' when no proxy headers are present", async () => {
    mockPublicLimiter.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    await checkPublicRateLimit(makeRequest());

    const key = mockPublicLimiter.limit.mock.calls[0]?.[0] as string;
    expect(key.startsWith("unknown:")).toBe(true);
  });

  it("normalizes dynamic URL segments to share a bucket across IDs", async () => {
    // Two different signing tokens must hit the same bucket per IP, otherwise
    // an attacker could cycle tokens to evade the limit.
    mockPublicLimiter.limit.mockResolvedValue({
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

    const keyA = mockPublicLimiter.limit.mock.calls[0]?.[0] as string;
    const keyB = mockPublicLimiter.limit.mock.calls[1]?.[0] as string;
    expect(keyA).toBe(keyB);
  });

  it("includes the HTTP method in the bucket so GET vs POST do not share a bucket", async () => {
    mockPublicLimiter.limit.mockResolvedValue({
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

    const keyGet = mockPublicLimiter.limit.mock.calls[0]?.[0] as string;
    const keyPost = mockPublicLimiter.limit.mock.calls[1]?.[0] as string;
    expect(keyGet).not.toBe(keyPost);
    expect(keyGet).toContain("GET:");
    expect(keyPost).toContain("POST:");
  });
});

describe("checkWebhookRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const WEBHOOK_URL =
    "http://localhost:3000/api/collaboration/notifications/email/webhook";

  function makeWebhookRequest(headers: Record<string, string> = {}): Request {
    return new Request(WEBHOOK_URL, { method: "POST", headers });
  }

  it("uses a 60/min sliding window (higher than the 10/min public limit)", () => {
    // The slidingWindow factory is invoked once per limiter at module load.
    // We need to know that the webhook profile got the 60-event ceiling, not
    // the public 10-event one — otherwise legitimate Resend bursts will 429.
    expect(slidingWindowConstructionCalls).toContain("10/60 s");
    expect(slidingWindowConstructionCalls).toContain("60/60 s");
  });

  it("uses the webhook limiter, not the public limiter", async () => {
    mockWebhookLimiter.limit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
    });

    const response = await checkWebhookRateLimit(makeWebhookRequest());
    expect(response).toBeNull();
    expect(mockWebhookLimiter.limit).toHaveBeenCalledTimes(1);
    // Crucial: webhook traffic must NOT consume the public mutation budget,
    // otherwise a noisy webhook source could starve contract signers.
    expect(mockPublicLimiter.limit).not.toHaveBeenCalled();
  });

  it("returns a 429 response when throttled", async () => {
    const reset = Date.now() + 60_000;
    mockWebhookLimiter.limit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset,
    });

    const response = await checkWebhookRateLimit(makeWebhookRequest());
    expect(response?.status).toBe(429);
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(response?.headers.get("Retry-After")).toBe("60");
  });

  it("fails open when the limiter throws so a Redis outage does not drop webhook events", async () => {
    mockWebhookLimiter.limit.mockRejectedValue(new Error("redis down"));

    const response = await checkWebhookRateLimit(makeWebhookRequest());
    expect(response).toBeNull();
  });

  it("buckets per-IP using x-forwarded-for", async () => {
    mockWebhookLimiter.limit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
    });

    await checkWebhookRateLimit(
      makeWebhookRequest({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })
    );

    const key = mockWebhookLimiter.limit.mock.calls[0]?.[0] as string;
    expect(key.startsWith("203.0.113.5:")).toBe(true);
    expect(key).toContain("POST:");
    expect(key).toContain("/api/collaboration/notifications/email/webhook");
  });
});
