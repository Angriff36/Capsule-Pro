Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
async function getTenantIdForOrg(orgId) {
  const account = await database_1.database.account.findFirst({
    where: { slug: orgId, deletedAt: null },
  });
  if (!account) {
    const newAccount = await database_1.database.account.create({
      data: {
        name: orgId,
        slug: orgId,
      },
    });
    return newAccount.id;
  }
  return account.id;
}
async function GET(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "12m";
    let months;
    if (period === "3m") {
      months = 3;
    } else if (period === "6m") {
      months = 6;
    } else {
      months = 12;
    }
    const result = await database_1.database.$queryRawUnsafe(
      `
      SELECT
        TO_CHAR(e.event_date, 'YYYY-MM') as month,
        COUNT(*) as total_events,
        COALESCE(
          AVG(
            CASE
              WHEN ep.actual_revenue > 0 THEN
                ((ep.actual_revenue - ep.actual_total_cost) / ep.actual_revenue) * 100
              ELSE NULL
            END
          ),
          0
        )::numeric as avg_gross_margin_pct,
        COALESCE(SUM(ep.actual_revenue), 0)::numeric as total_revenue,
        COALESCE(SUM(ep.actual_total_cost), 0)::numeric as total_cost,
        COALESCE(
          AVG(
            CASE
              WHEN ep.actual_revenue > 0 THEN (ep.actual_food_cost / ep.actual_revenue) * 100
              ELSE NULL
            END
          ),
          0
        )::numeric as avg_food_cost_pct,
        COALESCE(
          AVG(
            CASE
              WHEN ep.actual_revenue > 0 THEN (ep.actual_labor_cost / ep.actual_revenue) * 100
              ELSE NULL
            END
          ),
          0
        )::numeric as avg_labor_cost_pct,
        COALESCE(
          AVG(
            CASE
              WHEN ep.actual_revenue > 0 THEN (ep.actual_overhead / ep.actual_revenue) * 100
              ELSE NULL
            END
          ),
          0
        )::numeric as avg_overhead_pct
      FROM tenant_events.events e
      LEFT JOIN tenant_events.event_profitability ep
        ON e.tenant_id = ep.tenant_id AND e.id = ep.event_id AND ep.deleted_at IS NULL
      WHERE e.tenant_id = $1
        AND e.deleted_at IS NULL
        AND e.event_date >= NOW() - INTERVAL '1 month' * $2
      GROUP BY TO_CHAR(e.event_date, 'YYYY-MM')
      ORDER BY month ASC
      `,
      tenantId,
      months
    );
    const data = result.map((row) => ({
      period: row.month,
      totalEvents: Number(row.total_events),
      averageGrossMarginPct: Number(row.avg_gross_margin_pct),
      totalRevenue: Number(row.total_revenue),
      totalCost: Number(row.total_cost),
      averageFoodCostPct: Number(row.avg_food_cost_pct),
      averageLaborCostPct: Number(row.avg_labor_cost_pct),
      averageOverheadPct: Number(row.avg_overhead_pct),
    }));
    return server_2.NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching profitability data:", error);
    return server_2.NextResponse.json(
      { error: "Failed to fetch profitability data" },
      { status: 500 }
    );
  }
}
