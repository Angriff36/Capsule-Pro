/**
 * Singleton pg.Pool for Manifest adapters (PostgresAuditSink, PostgresOutboxStore).
 *
 * Uses DIRECT_URL (with DATABASE_URL fallback) for direct Postgres connections,
 * bypassing Prisma's connection pooler. The pool is lazily created and shared
 * across all Manifest adapter instances.
 *
 * Schema bootstrap: ensureManifestSchema() runs CREATE TABLE IF NOT EXISTS for
 * the audit and outbox tables on first call. Safe for concurrent execution.
 *
 * @packageDocumentation
 */

import { Pool } from "pg";

let _pool: Pool | undefined;
let _schemaEnsured = false;

/**
 * Get the singleton pg.Pool for Manifest Postgres adapters.
 * Lazily created from DIRECT_URL or DATABASE_URL.
 */
export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DIRECT_URL or DATABASE_URL required for Manifest Postgres adapters"
      );
    }
    _pool = new Pool({
      connectionString,
      max: 5, // Small pool — Manifest adapters are low-traffic
    });
  }
  return _pool;
}

/**
 * Ensure Manifest audit, outbox, and approval tables exist.
 *
 * Uses CREATE TABLE IF NOT EXISTS — idempotent and safe for concurrent
 * execution across multiple processes. Companion schemas match those shipped
 * in @angriff36/manifest/src/manifest/audit/sinks/postgres.sql,
 * @angriff36/manifest/src/manifest/outbox/stores/postgres.sql, and
 * @angriff36/manifest/src/manifest/approval/stores/postgres.sql.
 *
 * Called once per process lifetime (subsequent calls are no-ops).
 */
export async function ensureManifestSchema(): Promise<void> {
  if (_schemaEnsured) {
    return;
  }
  const pool = getPool();

  // -- Audit records table --------------------------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manifest_audit_records (
      record_id            TEXT PRIMARY KEY,
      occurred_at          BIGINT NOT NULL,
      tenant_id            TEXT,
      org_id               TEXT,
      actor_id             TEXT,
      request_id           TEXT,
      source               TEXT,
      entity               TEXT,
      command              TEXT NOT NULL,
      command_id           TEXT,
      outcome              TEXT NOT NULL,
      emitted_event_names  TEXT[],
      ir_hash              TEXT,
      diagnostics          JSONB,
      inserted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_audit_tenant_occurred
      ON manifest_audit_records (tenant_id, occurred_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_audit_command_occurred
      ON manifest_audit_records (command_id, occurred_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_audit_outcome
      ON manifest_audit_records (outcome)
  `);

  // -- Outbox entries table -------------------------------------------------
  // Includes subject_entity/subject_id for projectSubject=true support.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manifest_outbox_entries (
      entry_id        TEXT PRIMARY KEY,
      enqueued_at     BIGINT NOT NULL,
      event           JSONB NOT NULL,
      status          TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed')),
      attempts        INTEGER NOT NULL DEFAULT 0,
      last_error      TEXT,
      claimed_at      TIMESTAMPTZ,
      delivered_at    TIMESTAMPTZ,
      failed_at       TIMESTAMPTZ,
      inserted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      subject_entity  TEXT,
      subject_id      TEXT
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_outbox_pending_unclaimed
      ON manifest_outbox_entries (enqueued_at)
      WHERE status = 'pending' AND claimed_at IS NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_outbox_status
      ON manifest_outbox_entries (status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_outbox_subject_entity
      ON manifest_outbox_entries (subject_entity)
      WHERE subject_entity IS NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_outbox_subject_id
      ON manifest_outbox_entries (subject_id)
      WHERE subject_id IS NOT NULL
  `);

  // -- Approval requests table ----------------------------------------------
  // Companion schema: @angriff36/manifest/src/manifest/approval/stores/postgres.sql
  // One row per approval request, keyed by `${entity}:${instanceId}:${approvalName}`.
  // required_stages and grants are JSONB for flexible schema evolution.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manifest_approval_requests (
      request_key       TEXT PRIMARY KEY,
      entity            TEXT NOT NULL,
      instance_id       TEXT NOT NULL,
      approval_name     TEXT NOT NULL,
      command           TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'pending',
      required_stages   JSONB NOT NULL DEFAULT '[]',
      grants            JSONB NOT NULL DEFAULT '[]',
      requested_at      BIGINT NOT NULL,
      expires_at        BIGINT,
      denied_by         TEXT,
      denied_reason     TEXT,
      inserted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_approval_status
      ON manifest_approval_requests (status)
      WHERE status = 'pending'
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_manifest_approval_expires
      ON manifest_approval_requests (expires_at)
      WHERE status = 'pending' AND expires_at IS NOT NULL
  `);

  _schemaEnsured = true;
}
