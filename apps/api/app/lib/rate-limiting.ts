import "server-only";

import { database } from "@repo/database";
import crypto from "crypto";
import { requireTenantId } from "./tenant";

/**
 * Rate Limiting Service
 *
 * Provides per-tenant rate limiting for API endpoints with:
 * - Configurable limits per endpoint pattern
 * - Sliding window counting for accurate rate limiting
 * - Burst allowance for handling traffic spikes
 * - Usage tracking and analytics
 * - Async persistence to avoid blocking requests
 */

// ============================================================================
// Types
// ============================================================================

export interface RateLimitCheck {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until retry if not allowed
  configId?: string;
}

export interface RateLimitConfig {
  id: string;
  tenantId: string;
  name: string;
  endpointPattern: string;
  windowMs: number;
  maxRequests: number;
  burstAllowance: number;
  priority: number;
  isActive: boolean;
}

export interface UsageStats {
  endpoint: string;
  method: string;
  requestCount: number;
  blockedCount: number;
  avgResponseTime: number | null;
  maxResponseTime: number | null;
  uniqueUsers: number;
  bucketStart: Date;
}

// ============================================================================
// In-Memory Sliding Window
// ============================================================================

interface WindowCounter {
  count: number;
  burstCount: number;
  windowStart: number; // Timestamp
  lastReset: number; // Timestamp
}

/**
 * In-memory sliding window counter.
 * Uses a simple map with tenant + endpoint as key.
 *
 * For production with multiple API instances, this should be replaced
 * with Redis or another distributed cache.
 */
class SlidingWindow {
  private counters = new Map<string, WindowCounter>();
  private readonly cleanupIntervalMs = 60_000; // Clean up every minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup timer if not in test environment
    if (process.env.NODE_ENV !== "test") {
      this.startCleanup();
    }
  }

  /**
   * Get or create a counter for the given key
   */
  private getCounter(key: string, windowMs: number): WindowCounter {
    let counter = this.counters.get(key);
    const now = Date.now();

    if (!counter) {
      counter = {
        count: 0,
        burstCount: 0,
        windowStart: now,
        lastReset: now,
      };
      this.counters.set(key, counter);
      return counter;
    }

    // Check if window has expired
    if (now - counter.windowStart >= windowMs) {
      counter.count = 0;
      counter.burstCount = 0;
      counter.windowStart = now;
      counter.lastReset = now;
    }

    return counter;
  }

  /**
   * Increment the counter for the given key
   */
  increment(
    key: string,
    windowMs: number,
    maxRequests: number,
    burstAllowance: number
  ): { allowed: boolean; count: number; resetAt: Date } {
    const counter = this.getCounter(key, windowMs);
    const now = Date.now();

    // Calculate time since last reset for burst allowance
    const timeSinceReset = now - counter.lastReset;
    const burstRecoveryRate = burstAllowance / windowMs; // Burst tokens recovered per ms
    const recoveredBurst = Math.min(
      counter.burstCount,
      Math.floor(timeSinceReset * burstRecoveryRate)
    );

    counter.burstCount = Math.max(0, counter.burstCount - recoveredBurst);
    counter.lastReset = now;

    const effectiveLimit = maxRequests + burstAllowance - counter.burstCount;
    const allowed = counter.count < effectiveLimit;

    if (allowed) {
      counter.count++;
      // Track burst usage
      if (counter.count > maxRequests) {
        counter.burstCount++;
      }
    }

    const resetAt = new Date(counter.windowStart + windowMs);

    return {
      allowed,
      count: counter.count,
      resetAt,
    };
  }

  /**
   * Reset a specific counter (for testing or admin operations)
   */
  reset(key: string): void {
    this.counters.delete(key);
  }

  /**
   * Reset all counters (for testing)
   */
  resetAll(): void {
    this.counters.clear();
  }

  /**
   * Clean up expired counters to prevent memory leaks
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, counter] of this.counters.entries()) {
        // Delete counters that haven't been used in 5 minutes
        if (now - counter.windowStart > 300_000) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.counters.delete(key);
      }
    }, this.cleanupIntervalMs).unref();
  }

  /**
   * Get current count for a key (for monitoring/debugging)
   */
  getCount(key: string): number | undefined {
    return this.counters.get(key)?.count;
  }

  /**
   * Get total number of tracked keys (for monitoring)
   */
  size(): number {
    return this.counters.size;
  }
}

// Global sliding window instance
const slidingWindow = new SlidingWindow();

// ============================================================================
// Rate Limit Service
// ============================================================================

class RateLimitService {
  /**
   * Generate a cache key for the given tenant and endpoint
   */
  private generateKey(
    tenantId: string,
    endpoint: string,
    method: string
  ): string {
    return crypto
      .createHash("sha256")
      .update(`${tenantId}:${method}:${endpoint}`)
      .digest("hex")
      .substring(0, 32);
  }

  /**
   * Hash a value for privacy-preserving analytics
   */
  private hashValue(value: string): string {
    return crypto
      .createHash("sha256")
      .update(value)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Check if a pattern matches an endpoint
   * Supports simple wildcards (*) and regex patterns
   */
  private patternMatches(pattern: string, endpoint: string): boolean {
    // Convert wildcard pattern to regex
    if (pattern.includes("*")) {
      const regexPattern = pattern.replace(/\*/g, ".*").replace(/\//g, "\\/");
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(endpoint);
    }

    // Try as regex directly
    try {
      const regex = new RegExp(pattern);
      return regex.test(endpoint);
    } catch {
      // Not a valid regex, do exact match
      return pattern === endpoint;
    }
  }

  /**
   * Get applicable rate limit config for the given endpoint
   */
  private async getApplicableConfig(
    tenantId: string,
    endpoint: string
  ): Promise<RateLimitConfig | null> {
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

    // Find first matching pattern (by priority)
    for (const config of configs) {
      if (this.patternMatches(config.endpointPattern, endpoint)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Get or create default config for a tenant
   */
  private async ensureDefaultConfig(
    tenantId: string
  ): Promise<RateLimitConfig> {
    // Check for existing config
    const existing = await database.rateLimitConfig.findFirst({
      where: {
        tenantId,
        name: "Default API Limits",
        deletedAt: null,
      },
    });

    if (existing) {
      return existing;
    }

    // Create default config
    return database.rateLimitConfig.create({
      data: {
        tenantId,
        name: "Default API Limits",
        endpointPattern: "^/api/.*",
        windowMs: 60_000, // 1 minute
        maxRequests: 1000,
        burstAllowance: 100,
        priority: 0,
        isActive: true,
      },
    });
  }

  /**
   * Check if a request should be rate limited
   */
  async checkRateLimit(
    endpoint: string,
    method: string,
    userId?: string
  ): Promise<RateLimitCheck> {
    const tenantId = await requireTenantId();

    // Get applicable config
    const config = await this.getApplicableConfig(tenantId, endpoint);

    if (!config) {
      // No rate limiting configured
      return {
        allowed: true,
        limit: 0,
        remaining: -1,
        resetAt: new Date(Date.now() + 60_000),
      };
    }

    // Generate key for sliding window
    const key = this.generateKey(tenantId, endpoint, method);

    // Check against sliding window
    const result = slidingWindow.increment(
      key,
      config.windowMs,
      config.maxRequests,
      config.burstAllowance
    );

    const remaining = Math.max(
      0,
      config.maxRequests + config.burstAllowance - result.count
    );

    const checkResult: RateLimitCheck = {
      allowed: result.allowed,
      limit: config.maxRequests,
      remaining,
      resetAt: result.resetAt,
      configId: config.id,
    };

    if (!result.allowed) {
      checkResult.retryAfter = Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000
      );
    }

    // Asynchronously record usage (don't block the request)
    this.recordUsage(
      tenantId,
      endpoint,
      method,
      result.allowed,
      userId,
      config
    ).catch((err) => {
      console.error("[RateLimitService] Failed to record usage:", err);
    });

    return checkResult;
  }

  /**
   * Record usage for analytics (async, non-blocking)
   */
  private async recordUsage(
    tenantId: string,
    endpoint: string,
    method: string,
    allowed: boolean,
    userId: string | undefined,
    config: RateLimitConfig
  ): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / config.windowMs) * config.windowMs
    );

    // Upsert usage bucket
    const userHash = userId ? this.hashValue(userId) : null;

    await database.rateLimitUsage.upsert({
      where: {
        tenantId_endpoint_method_bucketStart: {
          tenantId,
          endpoint,
          method,
          bucketStart: windowStart,
        },
      },
      create: {
        tenantId,
        endpoint,
        method,
        bucketStart: windowStart,
        requestCount: allowed ? 1 : 0,
        blockedCount: allowed ? 0 : 1,
        userHashes: userHash ? [userHash] : [],
      },
      update: {
        requestCount: { increment: allowed ? 1 : 0 },
        blockedCount: { increment: allowed ? 0 : 1 },
        userHashes: userHash ? { push: userHash } : undefined,
      },
    });
  }

  /**
   * Record a rate limit event for detailed audit trail
   */
  async recordEvent(
    endpoint: string,
    method: string,
    check: RateLimitCheck,
    userId?: string,
    userAgent?: string,
    ipHash?: string,
    responseTime?: number
  ): Promise<void> {
    const tenantId = await requireTenantId();

    await database.rateLimitEvent.create({
      data: {
        tenantId,
        endpoint,
        method,
        allowed: check.allowed,
        windowStart: new Date(Date.now() - (check.configId ? 60_000 : 0)),
        windowEnd: check.resetAt,
        requestsInWindow: check.limit - check.remaining,
        limit: check.limit,
        userId,
        userAgent,
        ipHash,
        responseTime,
      },
    });
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(
    options: {
      endpoint?: string;
      method?: string;
      since?: Date;
      until?: Date;
      limit?: number;
    } = {}
  ): Promise<UsageStats[]> {
    const tenantId = await requireTenantId();

    const where: any = {
      tenantId,
    };

    if (options.endpoint) {
      where.endpoint = options.endpoint;
    }

    if (options.method) {
      where.method = options.method;
    }

    if (options.since || options.until) {
      where.bucketStart = {};
      if (options.since) where.bucketStart.gte = options.since;
      if (options.until) where.bucketStart.lte = options.until;
    }

    const stats = await database.rateLimitUsage.findMany({
      where,
      orderBy: {
        bucketStart: "desc",
      },
      take: options.limit ?? 100,
    });

    return stats.map((stat) => ({
      endpoint: stat.endpoint,
      method: stat.method,
      requestCount: stat.requestCount,
      blockedCount: stat.blockedCount,
      avgResponseTime: stat.avgResponseTime,
      maxResponseTime: stat.maxResponseTime,
      uniqueUsers: stat.userHashes?.length ?? 0,
      bucketStart: stat.bucketStart,
    }));
  }

  /**
   * Get rate limit events for audit trail
   */
  async getEvents(
    options: {
      limit?: number;
      offset?: number;
      allowed?: boolean;
      endpoint?: string;
      since?: Date;
    } = {}
  ): Promise<
    Array<{
      id: string;
      endpoint: string;
      method: string;
      allowed: boolean;
      requestsInWindow: number;
      limit: number;
      timestamp: Date;
    }>
  > {
    const tenantId = await requireTenantId();

    const where: any = {
      tenantId,
    };

    if (options.allowed !== undefined) {
      where.allowed = options.allowed;
    }

    if (options.endpoint) {
      where.endpoint = options.endpoint;
    }

    if (options.since) {
      where.timestamp = { gte: options.since };
    }

    const events = await database.rateLimitEvent.findMany({
      where,
      orderBy: {
        timestamp: "desc",
      },
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
      select: {
        id: true,
        endpoint: true,
        method: true,
        allowed: true,
        requestsInWindow: true,
        limit: true,
        timestamp: true,
      },
    });

    return events;
  }

  /**
   * Get all rate limit configs for the current tenant
   */
  async getConfigs(): Promise<RateLimitConfig[]> {
    const tenantId = await requireTenantId();

    return database.rateLimitConfig.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        priority: "desc",
      },
    });
  }

  /**
   * Create a new rate limit config
   */
  async createConfig(data: {
    name: string;
    endpointPattern: string;
    windowMs: number;
    maxRequests: number;
    burstAllowance?: number;
    priority?: number;
  }): Promise<RateLimitConfig> {
    const tenantId = await requireTenantId();

    return database.rateLimitConfig.create({
      data: {
        tenantId,
        name: data.name,
        endpointPattern: data.endpointPattern,
        windowMs: data.windowMs,
        maxRequests: data.maxRequests,
        burstAllowance: data.burstAllowance ?? 0,
        priority: data.priority ?? 0,
        isActive: true,
      },
    });
  }

  /**
   * Update a rate limit config
   */
  async updateConfig(
    id: string,
    data: Partial<{
      name: string;
      endpointPattern: string;
      windowMs: number;
      maxRequests: number;
      burstAllowance: number;
      priority: number;
      isActive: boolean;
    }>
  ): Promise<RateLimitConfig> {
    const tenantId = await requireTenantId();

    return database.rateLimitConfig.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data,
    });
  }

  /**
   * Delete a rate limit config
   */
  async deleteConfig(id: string): Promise<void> {
    const tenantId = await requireTenantId();

    await database.rateLimitConfig.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Reset rate limit counters (for admin/debugging)
   */
  async resetCounters(endpoint?: string): Promise<void> {
    if (endpoint) {
      const tenantId = await requireTenantId();
      const key = this.generateKey(tenantId, endpoint, "*");
      slidingWindow.reset(key);
    } else {
      slidingWindow.resetAll();
    }
  }

  /**
   * Get current counter status (for monitoring)
   */
  async getCounterStatus(
    endpoint: string,
    method: string
  ): Promise<{
    count: number | undefined;
    size: number;
  }> {
    const tenantId = await requireTenantId();
    const key = this.generateKey(tenantId, endpoint, method);

    return {
      count: slidingWindow.getCount(key),
      size: slidingWindow.size(),
    };
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Also export the class for testing
export { SlidingWindow, RateLimitService };
