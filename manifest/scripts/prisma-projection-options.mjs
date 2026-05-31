/**
 * Capsule PrismaProjectionOptions — Phase 2 pilot config (scoping stage).
 *
 * This is the single source of "entity → DB shape" truth the projection needs to reproduce the
 * committed schema.prisma. During the pilot it covers only the pilot entities; it grows as Phase 2
 * proceeds. NESTED shape `Record<Entity, Record<Prop, X>>` per the 1.5.0 options.d.ts (notes §11b).
 *
 * Two Capsule-specific gaps are handled OUTSIDE this bag, by the post-process in
 * generate-prisma-schema.mjs, because the 1.5.0 projection has no option for them (notes §11c):
 *   - ENTITY_SCHEMA_MAP → injected `@@schema("<domain>")`
 *   - COMPOSITE_KEY     → injected `@@id([tenantId, id])` (IR carries no `entity.key` today)
 */

// entity → Postgres schema (drives the injected @@schema). From committed schema.prisma @@schema(...).
export const ENTITY_SCHEMA_MAP = {
  RateLimitConfig: "tenant_admin",
  Event: "tenant_events",
  // New durable slice entities (no hand twin) — placed in existing declared schemas.
  StaffMember: "tenant_staff",
  EventStaff: "tenant_events",
};

// entity → composite primary key columns (drives the injected @@id). All Capsule tenant tables
// use [tenantId, id]; populate per entity as the pilot covers them.
export const COMPOSITE_KEY = {
  RateLimitConfig: ["tenantId", "id"],
  Event: ["tenantId", "id"],
  StaffMember: ["tenantId", "id"],
  EventStaff: ["tenantId", "id"],
};

// entity → @@map physical table name (only where we intentionally name the table).
export const TABLE_MAP = {
  StaffMember: "staff_members",
  EventStaff: "event_staff",
};

// The real PrismaProjectionOptions bag passed to the projection.
export const PILOT_OPTIONS = {
  // No `provider` → emit model blocks only (we merge into the existing schema.prisma header).
  tableMappings: {
    RateLimitConfig: "rate_limit_configs",
    Event: "events",
  },
  columnMappings: {
    RateLimitConfig: {
      tenantId: "tenant_id",
      endpointPattern: "endpoint_pattern",
      windowMs: "window_ms",
      maxRequests: "max_requests",
      burstAllowance: "burst_allowance",
      isActive: "is_active",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    },
  },
  dbAttributes: {
    RateLimitConfig: {
      tenantId: "Uuid",
      id: "Uuid",
      createdAt: "Timestamptz(6)",
      updatedAt: "Timestamptz(6)",
      deletedAt: "Timestamptz(6)",
    },
  },
  fieldAttributes: {
    RateLimitConfig: {
      id: ['@default(dbgenerated("gen_random_uuid()"))'],
      createdAt: ["@default(now())"],
      updatedAt: ["@default(now())", "@updatedAt"],
    },
  },
  // @@index entries (committed: [tenantId,isActive], [tenantId,priority]). @@unique([tenantId,name])
  // is an alternate key — verify whether the projection's `indexes` emits @@unique or only @@index;
  // if only @@index, the @@unique also needs the post-process. (Pilot TODO.)
  indexes: {
    RateLimitConfig: [
      ["tenantId", "isActive"],
      ["tenantId", "priority"],
    ],
  },
};
