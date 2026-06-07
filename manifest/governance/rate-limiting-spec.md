# Rate Limiting via Manifest DSL

## Purpose
Replace external rate-limiting middleware with Manifest-native `rateLimit` blocks in command definitions.

## Feature Description
Manifest provides a `rateLimit` block inside command definitions:

```manifest
command makeRequest() {
  rateLimit {
    window: 60000      // Time window in milliseconds
    maxRequests: 100    // Max requests within window
    scope: user.id      // user.id, tenant.id, or global
    strategy: fixed     // fixed or sliding
  }
  // command body
}
```

When the rate limit is exceeded, the command returns a `rateLimitExceeded` result with retry-after metadata.

## Current State
- `RateLimitConfig` entity exists in IR (durable, 12 properties, with create/update commands)
- Rate limiting is enforced outside Manifest (middleware layer)
- Zero commands use `rateLimit` blocks
- The entity tracks rate limit configuration but doesn't govern actual enforcement

## Migration Strategy
1. Add `rateLimit` blocks to high-traffic commands (API key validation, report generation, batch operations)
2. Wire `RateLimitConfig` entity values into the rate limit declarations via computed expressions or configuration
3. Remove external rate-limiting middleware
4. Verify rate limiting through Manifest runtime diagnostics

## High-Priority Commands for Rate Limiting
- `ApiKey.validate` (API key validation endpoint)
- Report generation commands (computationally expensive)
- Batch import commands (resource-intensive)
- `Notification.sendEmail` (external dependency)

## Validation
- `pnpm manifest:compile` succeeds with `rateLimit` blocks
- Exceeding rate limit returns `rateLimitExceeded` diagnostic
- Retry-after metadata present in response

## Source
- `docs/manifest-official/features/security-features.md`
- `docs/manifest-official/FEATURE-LIST.md` (feature `rate-limiting-policy`, v1.9.0)
