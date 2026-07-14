import { auth } from "@repo/auth/server";
import { analyticsDatabase } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface AdvancedAnalyticsResponse {
  clientPreferences: Array<{
    clientId: string;
    clientName: string;
    eventCount: number;
    totalRevenue: number;
    avgMargin: number;
    preferredEventTypes: string[];
    preferredVenues: string[];
  }>;
  eventTypeAnalysis: Array<{
    eventType: string;
    eventCount: number;
    avgRevenue: number;
    avgMargin: number;
    avgGuestCount: number;
  }>;
  predictiveInsights: {
    nextSeasonForecast: {
      expectedEvents: number;
      expectedRevenue: number;
      confidence: "low" | "medium" | "high";
    };
    recommendedActions: Array<{
      type: "pricing" | "menu" | "venue" | "cost_control";
      priority: "high" | "medium" | "low";
      title: string;
      description: string;
      potentialImpact: string;
    }>;
    riskFactors: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      description: string;
      mitigation: string;
    }>;
  };
  profitabilityTrends: Array<{
    period: string;
    revenue: number;
    margin: number;
    events: number;
  }>;
  summary: {
    totalEvents: number;
    totalRevenue: number;
    averageMargin: number;
    averageGuestCount: number;
    revenueTrend: "up" | "down" | "stable";
    marginTrend: "up" | "down" | "stable";
  };
  topMenuItems: Array<{
    dishId: string;
    dishName: string;
    category: string | null;
    eventCount: number;
    avgMarginPerEvent: number;
    totalRevenue: number;
  }>;
}

export async function GET(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "12m";

    let months: number;
    if (period === "3m") {
      months = 3;
    } else if (period === "6m") {
      months = 6;
    } else {
      months = 12;
    }

    // Fetch all necessary data in parallel queries. The top-dishes read is keyed
    // only on tenantId (independent of the event/profitability window), so it
    // joins the initial batch instead of awaiting its own round after the JS
    // aggregation below — collapsing 3 serial rounds to 2 (the clients read is
    // the only one that depends on a prior result: the events' clientIds).
    const [events, profitabilityData, topDishes] = await Promise.all([
      analyticsDatabase.$queryRawUnsafe<
        Array<{
          id: string;
          event_type: string;
          event_date: Date;
          guest_count: number;
          client_id: string | null;
          venue_name: string | null;
        }>
      >(
        `
        SELECT
          id,
          event_type,
          event_date,
          guest_count,
          client_id,
          venue_name
        FROM tenant_events.events
        WHERE tenant_id = $1
          AND deleted_at IS NULL
          AND event_date >= NOW() - INTERVAL '1 month' * $2
        ORDER BY event_date DESC
        `,
        tenantId,
        months
      ),
      analyticsDatabase.$queryRawUnsafe<
        Array<{
          event_id: string;
          actual_revenue: string;
          actual_gross_margin: string;
          actual_gross_margin_pct: string;
          calculated_at: Date;
        }>
      >(
        `
        SELECT
          event_id,
          actual_revenue,
          actual_gross_margin,
          (CASE WHEN actual_revenue <> 0 THEN actual_gross_margin / actual_revenue * 100 ELSE 0 END)::text as actual_gross_margin_pct,
          calculated_at
        FROM tenant_events.event_profitability
        WHERE tenant_id = $1
          AND deleted_at IS NULL
          AND calculated_at >= NOW() - INTERVAL '1 month' * $2
        `,
        tenantId,
        months
      ),
      // No direct event-dish relationship; dish popularity (menu_count) is the
      // proxy. Bounded with LIMIT 20.
      analyticsDatabase.$queryRawUnsafe<
        Array<{
          dish_id: string;
          dish_name: string;
          category: string | null;
          menu_count: number;
          avg_price: string;
        }>
      >(
        `
        SELECT
          d.id as dish_id,
          d.name as dish_name,
          d.category,
          COUNT(DISTINCT md.menu_id) as menu_count,
          COALESCE(AVG(d.price_per_person), 0) as avg_price
        FROM tenant_kitchen.dishes d
        LEFT JOIN tenant_kitchen.menu_dishes md ON d.tenant_id = md.tenant_id AND d.id = md.dish_id
        LEFT JOIN tenant_kitchen.menus m ON md.tenant_id = m.tenant_id AND md.menu_id = m.id
        WHERE d.tenant_id = $1
          AND d.deleted_at IS NULL
          AND (m.deleted_at IS NULL OR m.id IS NULL)
        GROUP BY d.id, d.name, d.category
        ORDER BY menu_count DESC, avg_price DESC
        LIMIT 20
        `,
        tenantId
      ),
    ]);

    // Fetch client information for events with clients
    const clientIds = events
      .map((e) => e.client_id)
      .filter((id): id is string => id !== null);

    const clients =
      clientIds.length > 0
        ? await analyticsDatabase.$queryRawUnsafe<
            Array<{
              id: string;
              company_name: string | null;
              first_name: string | null;
              last_name: string | null;
            }>
          >(
            `
            SELECT id, company_name, first_name, last_name
            FROM tenant_crm.clients
            WHERE tenant_id = $1 AND id = ANY($2)
            `,
            tenantId,
            clientIds
          )
        : [];

    const clientMap = new Map(
      clients.map((c) => [
        c.id,
        c.company_name ||
          `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
          "Unknown",
      ])
    );

    // Create profitability lookup map
    const profitMap = new Map(
      profitabilityData.map((p) => [
        p.event_id,
        {
          revenue: Number(p.actual_revenue),
          margin: Number(p.actual_gross_margin),
          marginPct: Number(p.actual_gross_margin_pct),
        },
      ])
    );

    // Calculate summary metrics
    const eventsWithProfit = events.filter((e) => profitMap.has(e.id));
    const totalEvents = eventsWithProfit.length;
    const totalRevenue = eventsWithProfit.reduce(
      (sum, e) => sum + (profitMap.get(e.id)?.revenue || 0),
      0
    );
    const totalMargin = eventsWithProfit.reduce(
      (sum, e) => sum + (profitMap.get(e.id)?.margin || 0),
      0
    );
    const averageMargin = totalEvents > 0 ? totalMargin / totalEvents : 0;
    const averageGuestCount =
      totalEvents > 0
        ? eventsWithProfit.reduce((sum, e) => sum + e.guest_count, 0) /
          totalEvents
        : 0;

    // Calculate trends (compare first half vs second half of period)
    const midPoint = Math.floor(eventsWithProfit.length / 2);
    const firstHalf = eventsWithProfit.slice(midPoint);
    const secondHalf = eventsWithProfit.slice(0, midPoint);

    const firstHalfAvgRevenue =
      firstHalf.length > 0
        ? firstHalf.reduce(
            (sum, e) => sum + (profitMap.get(e.id)?.revenue || 0),
            0
          ) / firstHalf.length
        : 0;
    const secondHalfAvgRevenue =
      secondHalf.length > 0
        ? secondHalf.reduce(
            (sum, e) => sum + (profitMap.get(e.id)?.revenue || 0),
            0
          ) / secondHalf.length
        : 0;

    const revenueTrend =
      secondHalfAvgRevenue > firstHalfAvgRevenue * 1.05
        ? ("up" as const)
        : secondHalfAvgRevenue < firstHalfAvgRevenue * 0.95
          ? ("down" as const)
          : ("stable" as const);

    const firstHalfAvgMargin =
      firstHalf.length > 0
        ? firstHalf.reduce(
            (sum, e) => sum + (profitMap.get(e.id)?.marginPct || 0),
            0
          ) / firstHalf.length
        : 0;
    const secondHalfAvgMargin =
      secondHalf.length > 0
        ? secondHalf.reduce(
            (sum, e) => sum + (profitMap.get(e.id)?.marginPct || 0),
            0
          ) / secondHalf.length
        : 0;

    const marginTrend =
      secondHalfAvgMargin > firstHalfAvgMargin * 1.02
        ? ("up" as const)
        : secondHalfAvgMargin < firstHalfAvgMargin * 0.98
          ? ("down" as const)
          : ("stable" as const);

    // Group by month for profitability trends
    const monthlyData = new Map<
      string,
      { revenue: number; margin: number; count: number }
    >();
    for (const event of eventsWithProfit) {
      const monthKey = event.event_date.toISOString().slice(0, 7);
      const existing = monthlyData.get(monthKey) || {
        revenue: 0,
        margin: 0,
        count: 0,
      };
      const profit = profitMap.get(event.id)!;
      monthlyData.set(monthKey, {
        revenue: existing.revenue + profit.revenue,
        margin: existing.margin + profit.margin,
        count: existing.count + 1,
      });
    }

    const profitabilityTrends = Array.from(monthlyData.entries())
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        margin: data.count > 0 ? data.margin / data.count : 0,
        events: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Event type analysis
    const eventTypeMap = new Map<
      string,
      { count: number; revenue: number; margin: number; guests: number }
    >();
    for (const event of eventsWithProfit) {
      const existing = eventTypeMap.get(event.event_type) || {
        count: 0,
        revenue: 0,
        margin: 0,
        guests: 0,
      };
      const profit = profitMap.get(event.id)!;
      eventTypeMap.set(event.event_type, {
        count: existing.count + 1,
        revenue: existing.revenue + profit.revenue,
        margin: existing.margin + profit.margin,
        guests: existing.guests + event.guest_count,
      });
    }

    const eventTypeAnalysis = Array.from(eventTypeMap.entries()).map(
      ([eventType, data]) => ({
        eventType,
        eventCount: data.count,
        avgRevenue: data.count > 0 ? data.revenue / data.count : 0,
        avgMargin: data.count > 0 ? data.margin / data.count : 0,
        avgGuestCount: data.count > 0 ? data.guests / data.count : 0,
      })
    );

    // Client preferences analysis
    const clientMapData = new Map<
      string,
      {
        name: string;
        count: number;
        revenue: number;
        margin: number;
        eventTypes: Set<string>;
        venues: Set<string>;
      }
    >();

    for (const event of eventsWithProfit) {
      if (event.client_id) {
        const existing = clientMapData.get(event.client_id);
        const profit = profitMap.get(event.id)!;
        const clientName = clientMap.get(event.client_id) || "Unknown";

        if (existing) {
          existing.count++;
          existing.revenue += profit.revenue;
          existing.margin += profit.margin;
          existing.eventTypes.add(event.event_type);
          if (event.venue_name) {
            existing.venues.add(event.venue_name);
          }
        } else {
          clientMapData.set(event.client_id, {
            name: clientName,
            count: 1,
            revenue: profit.revenue,
            margin: profit.margin,
            eventTypes: new Set([event.event_type]),
            venues: event.venue_name ? new Set([event.venue_name]) : new Set(),
          });
        }
      }
    }

    const clientPreferences = Array.from(clientMapData.entries())
      .map(([clientId, data]) => ({
        clientId,
        clientName: data.name,
        eventCount: data.count,
        totalRevenue: data.revenue,
        avgMargin: data.count > 0 ? data.margin / data.count : 0,
        preferredEventTypes: Array.from(data.eventTypes),
        preferredVenues: Array.from(data.venues),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // topDishes was preloaded in the initial parallel batch above; estimate
    // margin per event based on the average margin.
    const topMenuItems = topDishes.map((dish) => ({
      dishId: dish.dish_id,
      dishName: dish.dish_name,
      category: dish.category,
      eventCount: Number(dish.menu_count) || 0,
      avgMarginPerEvent: averageMargin,
      totalRevenue: Number(dish.avg_price) * (Number(dish.menu_count) || 0),
    }));

    // Generate predictive insights
    const monthlyEventRate = totalEvents / months;
    const nextSeasonForecast = {
      expectedEvents: Math.round(monthlyEventRate * 3),
      expectedRevenue: totalRevenue * (3 / months),
      confidence: (totalEvents >= 10
        ? "high"
        : totalEvents >= 5
          ? "medium"
          : "low") as "high" | "medium" | "low",
    };

    const recommendedActions: Array<{
      type: "pricing" | "menu" | "venue" | "cost_control";
      priority: "high" | "medium" | "low";
      title: string;
      description: string;
      potentialImpact: string;
    }> = [];

    const riskFactors: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      description: string;
      mitigation: string;
    }> = [];

    // Analyze and generate recommendations
    if (averageMargin < 20) {
      recommendedActions.push({
        type: "pricing",
        priority: "high",
        title: "Review Pricing Strategy",
        description:
          "Average margin is below 20%. Consider reviewing pricing tiers and cost structure.",
        potentialImpact: "+5-10% margin improvement",
      });
    }

    if (marginTrend === "down") {
      recommendedActions.push({
        type: "cost_control",
        priority: "high",
        title: "Address Declining Margins",
        description:
          "Margins have been trending down. Review food and labor costs.",
        potentialImpact: "Stabilize margins",
      });
      riskFactors.push({
        type: "Margin Decline",
        severity: "high",
        description: "Consistent downward trend in profit margins",
        mitigation: "Conduct detailed cost analysis and implement controls",
      });
    }

    const topEventType = eventTypeAnalysis.sort(
      (a, b) => b.eventCount - a.eventCount
    )[0];
    if (topEventType) {
      recommendedActions.push({
        type: "menu",
        priority: "medium",
        title: `Expand ${topEventType.eventType} Offerings`,
        description: `${topEventType.eventType} events are your most popular. Consider expanding menu options.`,
        potentialImpact: "Increased bookings",
      });
    }

    if (revenueTrend === "up" && marginTrend === "up") {
      recommendedActions.push({
        type: "venue",
        priority: "medium",
        title: "Consider Expansion",
        description:
          "Both revenue and margins are trending positively. Good time to consider growth.",
        potentialImpact: "Market share growth",
      });
    }

    if (totalEvents < 5) {
      riskFactors.push({
        type: "Low Volume",
        severity: "high",
        description: "Insufficient event data for reliable forecasting",
        mitigation: "Focus on lead generation and marketing",
      });
    }

    if (averageGuestCount < 50) {
      recommendedActions.push({
        type: "pricing",
        priority: "low",
        title: "Target Larger Events",
        description:
          "Average guest count is low. Consider strategies to attract larger events.",
        potentialImpact: "Higher per-event revenue",
      });
    }

    const response: AdvancedAnalyticsResponse = {
      summary: {
        totalEvents,
        totalRevenue,
        averageMargin,
        averageGuestCount,
        revenueTrend,
        marginTrend,
      },
      profitabilityTrends,
      topMenuItems,
      clientPreferences,
      eventTypeAnalysis,
      predictiveInsights: {
        nextSeasonForecast,
        recommendedActions,
        riskFactors,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching advanced analytics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch advanced analytics data" },
      { status: 500 }
    );
  }
}
