/**
 * Analytics domain queries for the main analytics dashboard.
 *
 * All functions wrapped with React cache() for per-request deduplication.
 * Tenant-scoped — every query filters by tenantId + deleted_at IS NULL.
 *
 * 10 raw SQL queries → 7 domain functions.
 */

import { Prisma } from "@repo/database";
import { cache } from "react";
import { timedQueryRaw } from "../data/db";

// ============================================================================
// Revenue
// ============================================================================

export const getRevenueMetrics = cache(
  async (
    tenantId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<{ currentRevenue: number; previousRevenue: number }> => {
    const [currentRows, previousRows] = await Promise.all([
      timedQueryRaw<Array<{ total_revenue: string | null }>>(
        Prisma.sql`
          SELECT COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
          FROM tenant_events.catering_orders
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND order_date >= ${currentStart}
            AND order_date < ${currentEnd}
        `,
        "analytics.revenue.current"
      ),
      timedQueryRaw<Array<{ total_revenue: string | null }>>(
        Prisma.sql`
          SELECT COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
          FROM tenant_events.catering_orders
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND order_date >= ${previousStart}
            AND order_date < ${previousEnd}
        `,
        "analytics.revenue.previous"
      ),
    ]);

    return {
      currentRevenue: Number(currentRows[0]?.total_revenue ?? 0),
      previousRevenue: Number(previousRows[0]?.total_revenue ?? 0),
    };
  }
);

// ============================================================================
// Labor
// ============================================================================

export interface LaborMetrics {
  actual_labor: string | null;
  budgeted_labor: string | null;
}

export const getLaborMetrics = cache(
  async (
    tenantId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<{ current: LaborMetrics; previous: LaborMetrics }> => {
    const [currentRows, previousRows] = await Promise.all([
      timedQueryRaw<LaborMetrics[]>(
        Prisma.sql`
          SELECT
            COALESCE(SUM(budgeted_labor_cost), 0)::numeric AS budgeted_labor,
            COALESCE(SUM(actual_labor_cost), 0)::numeric AS actual_labor
          FROM tenant_events.event_profitability
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND calculated_at >= ${currentStart}
            AND calculated_at < ${currentEnd}
        `,
        "analytics.labor.current"
      ),
      timedQueryRaw<LaborMetrics[]>(
        Prisma.sql`
          SELECT
            COALESCE(SUM(budgeted_labor_cost), 0)::numeric AS budgeted_labor,
            COALESCE(SUM(actual_labor_cost), 0)::numeric AS actual_labor
          FROM tenant_events.event_profitability
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND calculated_at >= ${previousStart}
            AND calculated_at < ${previousEnd}
        `,
        "analytics.labor.previous"
      ),
    ]);

    return {
      current: currentRows[0] ?? {
        budgeted_labor: null,
        actual_labor: null,
      },
      previous: previousRows[0] ?? {
        budgeted_labor: null,
        actual_labor: null,
      },
    };
  }
);

// ============================================================================
// Waste
// ============================================================================

export const getWasteMetrics = cache(
  async (
    tenantId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<{ currentWasteCost: number; previousWasteCost: number }> => {
    const [currentRows, previousRows] = await Promise.all([
      timedQueryRaw<Array<{ waste_cost: string | null }>>(
        Prisma.sql`
          SELECT COALESCE(SUM("totalCost"), 0)::numeric AS waste_cost
          FROM tenant_kitchen.waste_entries
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND logged_at >= ${currentStart}
            AND logged_at < ${currentEnd}
        `,
        "analytics.waste.current"
      ),
      timedQueryRaw<Array<{ waste_cost: string | null }>>(
        Prisma.sql`
          SELECT COALESCE(SUM("totalCost"), 0)::numeric AS waste_cost
          FROM tenant_kitchen.waste_entries
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND logged_at >= ${previousStart}
            AND logged_at < ${previousEnd}
        `,
        "analytics.waste.previous"
      ),
    ]);

    return {
      currentWasteCost: Number(currentRows[0]?.waste_cost ?? 0),
      previousWasteCost: Number(previousRows[0]?.waste_cost ?? 0),
    };
  }
);

// ============================================================================
// Margin
// ============================================================================

export const getMarginMetrics = cache(
  async (tenantId: string, start: Date, end: Date): Promise<number> => {
    const rows = await timedQueryRaw<Array<{ avg_margin: string | null }>>(
      Prisma.sql`
        SELECT COALESCE(AVG(CASE WHEN actual_revenue <> 0 THEN actual_gross_margin / actual_revenue * 100 ELSE 0 END), 0)::numeric AS avg_margin
        FROM tenant_events.event_profitability
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND calculated_at >= ${start}
          AND calculated_at < ${end}
      `,
      "analytics.margin"
    );

    return Number(rows[0]?.avg_margin ?? 0);
  }
);

// ============================================================================
// Event completion
// ============================================================================

export interface EventCompletion {
  completedEvents: number;
  completionRate: number;
  totalEvents: number;
}

export const getEventCompletion = cache(
  async (
    tenantId: string,
    start: Date,
    end: Date
  ): Promise<EventCompletion> => {
    const rows = await timedQueryRaw<
      Array<{ total_events: bigint; completed_events: bigint }>
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total_events,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::bigint AS completed_events
        FROM tenant_events.events
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND event_date >= ${start}
          AND event_date <= ${end}
      `,
      "analytics.completion"
    );

    const total = Number(rows[0]?.total_events ?? 0);
    const completed = Number(rows[0]?.completed_events ?? 0);

    return {
      totalEvents: total,
      completedEvents: completed,
      completionRate: total > 0 ? completed / total : 0,
    };
  }
);

// ============================================================================
// Follow-ups
// ============================================================================

export interface FollowUpMetrics {
  completedFollowUps: number;
  completionRate: number;
  totalFollowUps: number;
}

export const getFollowUpMetrics = cache(
  async (
    tenantId: string,
    start: Date,
    end: Date
  ): Promise<FollowUpMetrics> => {
    const rows = await timedQueryRaw<
      Array<{ total_followups: bigint; completed_followups: bigint }>
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total_followups,
          SUM(CASE WHEN follow_up_completed THEN 1 ELSE 0 END)::bigint AS completed_followups
        FROM tenant_crm.client_interactions
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND interaction_date >= ${start}
          AND interaction_date < ${end}
      `,
      "analytics.followUps"
    );

    const total = Number(rows[0]?.total_followups ?? 0);
    const completed = Number(rows[0]?.completed_followups ?? 0);

    return {
      totalFollowUps: total,
      completedFollowUps: completed,
      completionRate: total > 0 ? completed / total : 0,
    };
  }
);

// ============================================================================
// Top events
// ============================================================================

export interface TopEvent {
  id: string;
  marginPct: number;
  revenue: number;
  status: string;
  title: string;
}

export const getTopEvents = cache(
  async (
    tenantId: string,
    startOfWeek: Date,
    endOfWeek: Date
  ): Promise<TopEvent[]> => {
    const rows = await timedQueryRaw<
      Array<{
        id: string;
        title: string;
        status: string;
        revenue: string | null;
        margin_pct: string | null;
      }>
    >(
      Prisma.sql`
        SELECT
          e.id,
          e.title,
          e.status,
          COALESCE(ep.actual_revenue, e.budget, 0)::numeric AS revenue,
          COALESCE(
            CASE WHEN ep.actual_revenue <> 0 THEN ep.actual_gross_margin / ep.actual_revenue * 100 END,
            CASE WHEN ep.budgeted_revenue <> 0 THEN ep.budgeted_gross_margin / ep.budgeted_revenue * 100 END
          )::numeric AS margin_pct
        FROM tenant_events.events e
        LEFT JOIN tenant_events.event_profitability ep
          ON e.tenant_id = ep.tenant_id AND e.id = ep.event_id AND ep.deleted_at IS NULL
        WHERE e.tenant_id = ${tenantId}::uuid
          AND e.deleted_at IS NULL
          AND e.event_date >= ${startOfWeek}
          AND e.event_date <= ${endOfWeek}
        ORDER BY revenue DESC, e.event_date ASC
        LIMIT 5
      `,
      "analytics.topEvents"
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      revenue: Number(row.revenue ?? 0),
      marginPct: Number(row.margin_pct ?? 0),
    }));
  }
);
