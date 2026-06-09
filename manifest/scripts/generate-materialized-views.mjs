#!/usr/bin/env node
/**
 * Generates PostgreSQL CREATE MATERIALIZED VIEW DDL from the compiled
 * Manifest IR using the upstream MaterializedViewsProjection.
 *
 * Produces a single `views.sql` file containing DDL for high-value
 * analytics views across capsule-pro's multi-schema PostgreSQL layout.
 *
 * Usage:
 *   node manifest/scripts/generate-materialized-views.mjs
 *
 * Output: manifest/generated/materialized-views/views.sql
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");
const OUT_DIR = join(root, "manifest", "generated", "materialized-views");
const OUT_FILE = join(OUT_DIR, "views.sql");

// ── Load IR ──
console.log("[materialized-views] Loading IR...");
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

// ── Import projection from dist ──
const generatorPath = join(
  root, "node_modules", "@angriff36", "manifest",
  "dist", "manifest", "projections", "materialized-views", "generator.js"
);
const generatorUrl = import.meta.resolve(
  `file://${generatorPath.replace(/\\/g, "/")}`
);
const { MaterializedViewsProjection } = await import(generatorUrl);
const projection = new MaterializedViewsProjection();

// ── View definitions ──
// Each view targets a real Prisma-mapped table in capsule-pro's multi-schema DB.
// sourceTable uses the actual @@map table name; schema qualification is per-view.

const views = [
  // ── 1. Event Profitability Summary ──
  // Aggregates budgeted vs actual financials per event.
  {
    name: "event_profitability_summary",
    source: "EventProfitability",
    sourceTable: "tenant_events.event_profitability",
    refreshStrategy: "on-demand",
    columns: {
      event_id: "event_id",
      budgeted_revenue: "budgeted_revenue",
      actual_revenue: "actual_revenue",
      budgeted_total_cost: "budgeted_total_cost",
      actual_total_cost: "actual_total_cost",
      budgeted_gross_margin: "budgeted_gross_margin",
      actual_gross_margin: "actual_gross_margin",
      revenue_variance: "revenue_variance",
      margin_variance_pct: "margin_variance_pct",
      calculated_at: "calculated_at",
      calculation_method: "calculation_method",
    },
    indexes: [
      { columns: ["event_id"], unique: true },
    ],
  },

  // ── 2. Inventory Valuation ──
  // Current stock valuation across all inventory items.
  {
    name: "inventory_valuation",
    source: "InventoryItem",
    sourceTable: "tenant_inventory.inventory_items",
    refreshStrategy: "scheduled",
    schedule: { interval: "1 hour" },
    columns: {
      id: "id",
      item_number: "item_number",
      name: "name",
      category: "category",
      unit_cost: "unit_cost",
      quantity_on_hand: "quantity_on_hand",
      quantity_reserved: "quantity_reserved",
      available_qty: "quantity_on_hand - quantity_reserved",
      total_value: "(quantity_on_hand - quantity_reserved) * unit_cost",
      par_level: "par_level",
      reorder_level: "reorder_level",
      below_par: "CASE WHEN quantity_on_hand < par_level THEN true ELSE false END",
      fsa_status: "fsa_status",
    },
    indexes: [
      { columns: ["category"] },
      { columns: ["below_par"] },
    ],
  },

  // ── 3. Kitchen Task Metrics ──
  // Task completion and timing metrics for kitchen operations.
  {
    name: "kitchen_task_metrics",
    source: "KitchenTask",
    sourceTable: "tenant_kitchen.kitchen_tasks",
    refreshStrategy: "on-demand",
    columns: {
      id: "id",
      title: "title",
      status: "status",
      priority: "priority",
      complexity: "complexity",
      assigned_to: "assigned_to",
      due_date: "due_date",
      completed_at: "completed_at",
      created_at: "created_at",
      duration_hours: "CASE WHEN completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600.0 ELSE NULL END",
      is_overdue: "CASE WHEN completed_at IS NULL AND due_date IS NOT NULL AND NOW() > due_date THEN true ELSE false END",
    },
    indexes: [
      { columns: ["status"] },
      { columns: ["priority", "status"] },
      { columns: ["assigned_to"] },
    ],
  },

  // ── 4. Staff Performance Summary ──
  // Performance review ratings and completion metrics.
  {
    name: "staff_performance_summary",
    source: "StaffPerformance",
    sourceTable: "tenant_staff.StaffPerformance",
    refreshStrategy: "on-demand",
    columns: {
      id: "id",
      employee_id: "employee_id",
      review_type: "review_type",
      status: "status",
      rating: "rating",
      reviewer_id: "reviewer_id",
      period_start: "period_start",
      period_end: "period_end",
      completed_at: "completed_at",
      acknowledged_at: "acknowledged_at",
      is_acknowledged: "CASE WHEN acknowledged_at IS NOT NULL THEN true ELSE false END",
    },
    indexes: [
      { columns: ["employee_id"] },
      { columns: ["rating"] },
    ],
  },

  // ── 5. Vendor Spend Summary ──
  // Aggregates purchase order spending by vendor with contract context.
  {
    name: "vendor_spend_summary",
    source: "PurchaseOrder",
    sourceTable: "tenant_inventory.purchase_orders",
    refreshStrategy: "scheduled",
    schedule: { interval: "1 hour" },
    columns: {
      id: "id",
      vendor_id: "vendor_id",
      po_number: "po_number",
      status: "status",
      subtotal: "subtotal",
      tax_amount: "tax_amount",
      shipping_amount: "shipping_amount",
      total: "total",
      order_date: "order_date",
      expected_delivery_date: "expected_delivery_date",
      actual_delivery_date: "actual_delivery_date",
      is_delivered: "CASE WHEN actual_delivery_date IS NOT NULL THEN true ELSE false END",
      delivery_days: "CASE WHEN actual_delivery_date IS NOT NULL AND order_date IS NOT NULL THEN EXTRACT(DAY FROM (actual_delivery_date - order_date)) ELSE NULL END",
    },
    indexes: [
      { columns: ["vendor_id"] },
      { columns: ["status"] },
      { columns: ["order_date"] },
    ],
  },

  // ── 6. Waste Analytics ──
  // Waste tracking with cost impact and approval status.
  {
    name: "waste_analytics",
    source: "WasteEntry",
    sourceTable: "inventory.WasteEntry",
    refreshStrategy: "on-demand",
    columns: {
      id: "id",
      inventory_item_id: "inventory_item_id",
      reason_id: "reason_id",
      quantity: "quantity",
      unit_cost: "unit_cost",
      total_cost: "total_cost",
      location_id: "location_id",
      event_id: "event_id",
      logged_by: "logged_by",
      logged_at: "logged_at",
      approved_by: "approved_by",
      approved_at: "approved_at",
      status: "status",
      is_approved: "CASE WHEN approved_at IS NOT NULL THEN true ELSE false END",
    },
    indexes: [
      { columns: ["inventory_item_id"] },
      { columns: ["status"] },
      { columns: ["logged_at"] },
      { columns: ["reason_id"] },
    ],
  },
];

// ── Generate ──
const result = projection.generate(ir, {
  surface: "materialized-views.ddl",
  options: {
    emitSingleFile: true,
    output: "views.sql",
    emitRefreshStatements: true,
    views,
  },
});

// ── Report diagnostics ──
const errors = [];
const warnings = [];
const info = [];

for (const d of result.diagnostics || []) {
  if (d.severity === "error") {
    errors.push(d);
    console.error(`  [materialized-views] ERROR ${d.code}: ${d.message}`);
  } else if (d.severity === "warning") {
    warnings.push(d);
    console.warn(`  [materialized-views] WARN ${d.code}: ${d.message}`);
  } else {
    info.push(d);
  }
}

if (errors.length > 0) {
  console.error(`\n[materialized-views] ${errors.length} error(s) — some views may have been skipped.`);
}

// ── Write output ──
if (!result.artifacts?.length) {
  console.error("[materialized-views] No artifacts produced. Aborting.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const sql = result.artifacts[0].code;
writeFileSync(OUT_FILE, sql);

// ── Summary ──
const viewCount = (sql.match(/CREATE MATERIALIZED VIEW/g) || []).length;
const indexCount = (sql.match(/CREATE (UNIQUE )?INDEX/g) || []).length;
const refreshCount = (sql.match(/REFRESH MATERIALIZED VIEW/g) || []).length;
const lines = sql.split("\n").length;

console.log(`\n[materialized-views] Generated: ${viewCount} views, ${indexCount} indexes, ${refreshCount} refresh statements`);
console.log(`[materialized-views] Output: ${lines} lines`);
console.log(`[materialized-views] Diagnostics: ${errors.length} errors, ${warnings.length} warnings, ${info.length} info`);
console.log(`[materialized-views] File: ${OUT_FILE}`);
