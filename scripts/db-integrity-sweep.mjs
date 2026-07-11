#!/usr/bin/env node
/**
 * Scheduled DB integrity sweep — compensating control for a schema that
 * deliberately has NO foreign keys (flat keys, composite [tenant_id, id])
 * and uses soft deletes (deleted_at columns).
 *
 * Known orphan-creating bug class (repo memory 2026-07-08): the UI dish/recipe
 * delete sets deleted_at via raw SQL but SKIPS the governed Dish.deactivate
 * prune middleware, orphaning PrepTask / PrepListItem / EventDish rows that
 * still reference the soft-deleted (or hard-missing) Dish. Without FKs the
 * database cannot catch this — this sweep does.
 *
 * Tables are Postgres multi-schema (@@schema in prisma):
 *   tenant_kitchen.dishes / prep_tasks / prep_list_items / prep_lists
 *   tenant_events.events / event_dishes / event_staff
 *   tenant_accounting.invoices
 * NOTE: event_staff uses camelCase column names ("tenantId", "eventId",
 * "deletedAt") unlike every other table — quoted identifiers required.
 *
 * Usage: DATABASE_URL=postgres://... node scripts/db-integrity-sweep.mjs
 * Exit codes: 0 = clean, 1 = findings, 2 = config/connection error.
 *
 * READ-ONLY: runs SELECTs only. Each finding query is LIMIT 50 for the
 * sample; the reported count is the full COUNT(*).
 */

import pg from "pg";

const { Client } = pg;
const SAMPLE_LIMIT = 50;

/**
 * Each check: `sql` selects orphaned rows (no LIMIT — appended for samples,
 * wrapped in COUNT(*) for totals). All joins are flat-key composite
 * (tenant_id, id) matching the Prisma relation definitions.
 */
const CHECKS = [
  // ── Bug class: UI dish delete (raw SQL deleted_at) skips governed prune ──
  {
    name: "prep_tasks -> soft-deleted/absent dish",
    bugClass:
      "Dish soft-deleted via raw SQL without pruning its PrepTasks (governed Dish.deactivate prune middleware bypassed)",
    sql: `
      SELECT pt.tenant_id, pt.id, pt.dish_id AS ref_id, pt.name AS label
      FROM tenant_kitchen.prep_tasks pt
      LEFT JOIN tenant_kitchen.dishes d
        ON d.tenant_id = pt.tenant_id AND d.id = pt.dish_id
      WHERE pt.deleted_at IS NULL
        AND pt.dish_id IS NOT NULL
        AND (d.id IS NULL OR d.deleted_at IS NOT NULL)`,
  },
  {
    name: "prep_list_items -> soft-deleted/absent dish",
    bugClass:
      "Dish soft-deleted via raw SQL without pruning its PrepListItems (governed prune bypassed)",
    sql: `
      SELECT pli.tenant_id, pli.id, pli.dish_id AS ref_id, pli.ingredient_name AS label
      FROM tenant_kitchen.prep_list_items pli
      LEFT JOIN tenant_kitchen.dishes d
        ON d.tenant_id = pli.tenant_id AND d.id = pli.dish_id
      WHERE pli.deleted_at IS NULL
        AND pli.dish_id IS NOT NULL
        AND (d.id IS NULL OR d.deleted_at IS NOT NULL)`,
  },
  {
    name: "event_dishes -> soft-deleted/absent dish",
    bugClass:
      "Dish soft-deleted via raw SQL without pruning its EventDishes (governed prune bypassed); event menus now point at a hidden dish",
    sql: `
      SELECT ed.tenant_id, ed.id, ed.dish_id AS ref_id, ed.event_id::text AS label
      FROM tenant_events.event_dishes ed
      LEFT JOIN tenant_kitchen.dishes d
        ON d.tenant_id = ed.tenant_id AND d.id = ed.dish_id
      WHERE ed.deleted_at IS NULL
        AND (d.id IS NULL OR d.deleted_at IS NOT NULL)`,
  },

  // ── Bug class: event soft-deleted/removed but children not cascaded ──
  // No FKs + soft deletes means nothing stops an Event delete from stranding
  // live child rows. Highest-traffic event children per schema relations:
  {
    name: "prep_tasks -> soft-deleted/absent event",
    bugClass:
      "Event deleted without cascading to its PrepTasks (event_id is NOT NULL — every live prep task must have a live event)",
    sql: `
      SELECT pt.tenant_id, pt.id, pt.event_id AS ref_id, pt.name AS label
      FROM tenant_kitchen.prep_tasks pt
      LEFT JOIN tenant_events.events e
        ON e.tenant_id = pt.tenant_id AND e.id = pt.event_id
      WHERE pt.deleted_at IS NULL
        AND (e.id IS NULL OR e.deleted_at IS NOT NULL)`,
  },
  {
    name: "prep_lists -> soft-deleted/absent event",
    bugClass:
      "Event deleted without cascading to its PrepLists (kitchen keeps producing lists for a dead event)",
    sql: `
      SELECT pl.tenant_id, pl.id, pl.event_id AS ref_id, pl.name AS label
      FROM tenant_kitchen.prep_lists pl
      LEFT JOIN tenant_events.events e
        ON e.tenant_id = pl.tenant_id AND e.id = pl.event_id
      WHERE pl.deleted_at IS NULL
        AND (e.id IS NULL OR e.deleted_at IS NOT NULL)`,
  },
  {
    name: "event_dishes -> soft-deleted/absent event",
    bugClass:
      "Event deleted without cascading to its EventDishes (orphaned menu lines)",
    sql: `
      SELECT ed.tenant_id, ed.id, ed.event_id AS ref_id, ed.dish_id::text AS label
      FROM tenant_events.event_dishes ed
      LEFT JOIN tenant_events.events e
        ON e.tenant_id = ed.tenant_id AND e.id = ed.event_id
      WHERE ed.deleted_at IS NULL
        AND (e.id IS NULL OR e.deleted_at IS NOT NULL)`,
  },
  {
    name: "invoices -> soft-deleted/absent event",
    bugClass:
      "Event deleted with live invoices still attached (billing references a dead event — financial risk)",
    sql: `
      SELECT i.tenant_id, i.id, i.event_id AS ref_id, i.invoice_number AS label
      FROM tenant_accounting.invoices i
      LEFT JOIN tenant_events.events e
        ON e.tenant_id = i.tenant_id AND e.id = i.event_id
      WHERE i.deleted_at IS NULL
        AND (e.id IS NULL OR e.deleted_at IS NOT NULL)`,
  },
  {
    // ⚠ event_staff is the one table with camelCase physical columns.
    name: "event_staff -> soft-deleted/absent event",
    bugClass:
      "Event deleted without unassigning staff (staff still scheduled against a dead event)",
    sql: `
      SELECT es."tenantId" AS tenant_id, es.id, es."eventId" AS ref_id, COALESCE(es.role, '') AS label
      FROM tenant_events.event_staff es
      LEFT JOIN tenant_events.events e
        ON e.tenant_id::text = es."tenantId" AND e.id::text = es."eventId"
      WHERE es."deletedAt" IS NULL
        AND (e.id IS NULL OR e.deleted_at IS NOT NULL)`,
  },
];

function fail(message) {
  console.error(`db-integrity-sweep: ${message}`);
  process.exit(2);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail(
    "DATABASE_URL is not set. Provide a Postgres connection string, e.g.\n" +
      "  DATABASE_URL=postgres://user:pass@host/db node scripts/db-integrity-sweep.mjs"
  );
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
} catch (error) {
  fail(`could not connect to database: ${error.message}`);
}

let totalFindings = 0;
const lines = [];

try {
  for (const check of CHECKS) {
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM (${check.sql}) sub`
    );
    const count = countResult.rows[0].count;

    if (count === 0) {
      lines.push(`OK    ${check.name}`);
      continue;
    }

    totalFindings += count;
    const sample = await client.query(`${check.sql} LIMIT ${SAMPLE_LIMIT}`);
    lines.push(`FAIL  ${check.name} — ${count} row(s)`);
    lines.push(`      bug class: ${check.bugClass}`);
    for (const row of sample.rows) {
      lines.push(
        `      tenant=${row.tenant_id} id=${row.id} ref=${row.ref_id} (${row.label})`
      );
    }
    if (count > SAMPLE_LIMIT) {
      lines.push(
        `      ... ${count - SAMPLE_LIMIT} more (sample capped at ${SAMPLE_LIMIT})`
      );
    }
  }
} catch (error) {
  fail(`query failed: ${error.message}`);
} finally {
  await client.end().catch(() => {
    // Best-effort cleanup — a close failure must not mask the sweep result.
  });
}

console.log("DB integrity sweep report");
console.log(`Ran ${CHECKS.length} checks at ${new Date().toISOString()}`);
console.log("");
console.log(lines.join("\n"));
console.log("");

if (totalFindings > 0) {
  console.log(
    `RESULT: ${totalFindings} orphaned row(s) found. ` +
      "See docs/database/README.md and the governed prune middleware (Dish.deactivate) before repairing."
  );
  process.exit(1);
}

console.log("RESULT: clean — no orphaned rows detected.");
process.exit(0);
