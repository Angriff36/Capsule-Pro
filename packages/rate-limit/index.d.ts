import { Ratelimit, type RatelimitConfig } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
export declare const redis: Redis;
export declare const createRateLimiter: (
  props: Omit<RatelimitConfig, "redis">
) => Ratelimit;
export declare const slidingWindow: typeof Ratelimit.slidingWindow;
//# sourceMappingURL=index.d.ts.map
