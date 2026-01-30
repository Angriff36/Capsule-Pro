# Migration 0001_enable_pgcrypto

## Date
2026-01-01 00:00:00

## Description
Enables the pgcrypto PostgreSQL extension to provide cryptographic functions, specifically `gen_random_uuid()` for UUID generation.

## Changes

### Extension Added
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### What is pgcrypto?
The `pgcrypto` extension provides cryptographic functions for PostgreSQL:
- **gen_random_uuid()**: Generates random UUIDs (version 4)
- Encryption/decryption functions
- Digest functions (SHA, MD5)
- Other cryptographic utilities

### Why This Migration?
While the initial migration (0000_init) enabled pgcrypto, this separate migration:
1. Ensures pgcrypto is available before creating tables that use `gen_random_uuid()`
2. Provides a clear separation between schema setup and extension dependencies
3. Allows for easier extension management and versioning

### Usage in Schema
After this migration, tables use `gen_random_uuid()` as default value for UUID columns:
```sql
"id" UUID NOT NULL DEFAULT gen_random_uuid()
```

### Dependencies
This migration must run BEFORE any table creation that uses `gen_random_uuid()`.

### Rollback
To rollback:
```sql
DROP EXTENSION IF EXISTS pgcrypto;
```
**WARNING**: Rolling back this migration will break any tables that use `gen_random_uuid()` as a default value.

## Notes
- The initial migration (0000_init) also enabled pgcrypto
- This migration may be redundant in some contexts, but ensures idempotency
- pgcrypto is a standard PostgreSQL extension included in PostgreSQL 9.4+
- No additional schema changes or permissions required
