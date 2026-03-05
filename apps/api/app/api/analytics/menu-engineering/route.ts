import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface MenuItemAnalysis {
  dish_id: string;
  dish_name: string;
  category: string | null;
  price_per_person: string | null;
  cost_per_person: string | null;
  total_orders: string;
  total_guests_served: string;
  total_revenue: string;
  total_cost: string;
  contribution_margin: string;
  margin_percent: string;
}

interface DateRange {
  now: Date;
  startDate: Date;
}

function calculateDateRange(period: string): DateRange {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "12m":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return { now, startDate };
}

async function fetchMenuItemAnalysis(
  tenantId: string,
  startDate: Date,
  locationId: string | null
) {
  const locationFilter = locationId ? `AND e.location_id = ${locationId}` : "";

  return await database.$queryRawUnsafe<MenuItemAnalysis[]>(
    `
    SELECT
      d.id as dish_id,
      d.name as dish_name,
      d.category as category,
      d.price_per_person,
      d.cost_per_person,
      COUNT(DISTINCT ed.event_id)::int as total_orders,
      COALESCE(SUM(ed.quantity_servings), 0)::int as total_guests_served,
      COALESCE(SUM(ed.quantity_servings * d.price_per_person), 0)::numeric as total_revenue,
      COALESCE(SUM(ed.quantity_servings * d.cost_per_person), 0)::numeric as total_cost,
      COALESCE(SUM(ed.quantity_servings * (d.price_per_person - d.cost_per_person)), 0)::numeric as contribution_margin,
      CASE
        WHEN COALESCE(SUM(ed.quantity_servings * d.price_per_person), 0) > 0
        THEN (COALESCE(SUM(ed.quantity_servings * (d.price_per_person - d.cost_per_person)), 0) / COALESCE(SUM(ed.quantity_servings * d.price_per_person), 0)) * 100
        ELSE 0
      END::numeric as margin_percent
    FROM tenant_kitchen.dishes d
    INNER JOIN tenant_events.event_dishes ed ON d.tenant_id = ed.tenant_id AND d.id = ed.dish_id
    INNER JOIN tenant_events.events e ON ed.tenant_id = e.tenant_id AND ed.event_id = e.id
    WHERE d.tenant_id = $1
      AND d.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND ed.deleted_at IS NULL
      AND e.event_date >= $2
      ${locationFilter}
    GROUP BY d.id, d.name, d.category, d.price_per_person, d.cost_per_person
    HAVING COALESCE(SUM(ed.quantity_servings), 0) > 0
    ORDER BY contribution_margin DESC
    `,
    locationId ? [tenantId, startDate, locationId] : [tenantId, startDate]
  );
}

interface MenuPerformanceSummary {
  total_dishes: number;
  active_dishes: number;
  total_orders: number;
  total_revenue: number;
  total_cost: number;
  total_contribution_margin: number;
  average_margin_percent: number;
  top_performing_dish: {
    id: string;
    name: string;
    contribution_margin: number;
  } | null;
  low_performing_dish: {
    id: string;
    name: string;
    contribution_margin: number;
  } | null;
}

interface CategoryAnalysis {
  category: string;
  totalDishes: number;
  totalOrders: number;
  totalRevenue: number;
  totalContributionMargin: number;
  averageMarginPercent: number;
  topDish: string | null;
}

async function fetchMenuPerformanceSummary(
  menuItemAnalysis: MenuItemAnalysis[]
): Promise<MenuPerformanceSummary> {
  if (menuItemAnalysis.length === 0) {
    return {
      total_dishes: 0,
      active_dishes: 0,
      total_orders: 0,
      total_revenue: 0,
      total_cost: 0,
      total_contribution_margin: 0,
      average_margin_percent: 0,
      top_performing_dish: null,
      low_performing_dish: null,
    };
  }

  const totalOrders = menuItemAnalysis.reduce(
    (sum, item) => sum + Number(item.total_orders),
    0
  );
  const totalRevenue = menuItemAnalysis.reduce(
    (sum, item) => sum + Number(item.total_revenue),
    0
  );
  const totalCost = menuItemAnalysis.reduce(
    (sum, item) => sum + Number(item.total_cost),
    0
  );
  const totalContributionMargin = menuItemAnalysis.reduce(
    (sum, item) => sum + Number(item.contribution_margin),
    0
  );

  const averageMarginPercent =
    totalRevenue > 0 ? (totalContributionMargin / totalRevenue) * 100 : 0;

  const sortedByMargin = [...menuItemAnalysis].sort(
    (a, b) => Number(b.contribution_margin) - Number(a.contribution_margin)
  );

  const topDish = sortedByMargin[0];
  const lowDish = sortedByMargin[sortedByMargin.length - 1];

  return {
    total_dishes: menuItemAnalysis.length,
    active_dishes: menuItemAnalysis.length,
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    total_contribution_margin: totalContributionMargin,
    average_margin_percent: averageMarginPercent,
    top_performing_dish: topDish
      ? {
          id: topDish.dish_id,
          name: topDish.dish_name,
          contribution_margin: Number(topDish.contribution_margin),
        }
      : null,
    low_performing_dish: lowDish
      ? {
          id: lowDish.dish_id,
          name: lowDish.dish_name,
          contribution_margin: Number(lowDish.contribution_margin),
        }
      : null,
  };
}

function calculatePopularityScore(
  item: MenuItemAnalysis,
  maxOrders: number,
  maxGuests: number
): number {
  const orders = Number(item.total_orders);
  const guests = Number(item.total_guests_served);

  const orderScore = maxOrders > 0 ? (orders / maxOrders) * 50 : 0;
  const guestScore = maxGuests > 0 ? (guests / maxGuests) * 50 : 0;

  return Math.round(orderScore + guestScore);
}

function getMenuQuadrant(
  item: MenuItemAnalysis,
  avgMargin: number,
  popularityScore: number
): string {
  const marginPercent = Number(item.margin_percent);

  // Menu Engineering Matrix (Boston Matrix for Menus)
  // High Popularity (score >= 50) + High Margin (>= avgMargin) = Star
  // High Popularity (score >= 50) + Low Margin (< avgMargin) = Plowhorse
  // Low Popularity (score < 50) + High Margin (>= avgMargin) = Puzzle
  // Low Popularity (score < 50) + Low Margin (< avgMargin) = Dog

  if (popularityScore >= 50 && marginPercent >= avgMargin) {
    return "star"; // High popularity, high margin - keep promoting
  }
  if (popularityScore >= 50 && marginPercent < avgMargin) {
    return "plowhorse"; // High popularity, low margin - raise price or reduce cost
  }
  if (popularityScore < 50 && marginPercent >= avgMargin) {
    return "puzzle"; // Low popularity, high margin - promote more
  }
  return "dog"; // Low popularity, low margin - consider removing
}

function getCategoryAnalysis(
  menuItemAnalysis: MenuItemAnalysis[]
): CategoryAnalysis[] {
  const categoryMap = new Map<string, MenuItemAnalysis[]>();

  for (const item of menuItemAnalysis) {
    const category = item.category || "Uncategorized";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(item);
  }

  return Array.from(categoryMap.entries())
    .map(([category, items]) => {
      const totalOrders = items.reduce(
        (sum, item) => sum + Number(item.total_orders),
        0
      );
      const totalRevenue = items.reduce(
        (sum, item) => sum + Number(item.total_revenue),
        0
      );
      const totalContributionMargin = items.reduce(
        (sum, item) => sum + Number(item.contribution_margin),
        0
      );
      const averageMarginPercent =
        totalRevenue > 0 ? (totalContributionMargin / totalRevenue) * 100 : 0;

      const sortedByMargin = [...items].sort(
        (a, b) => Number(b.contribution_margin) - Number(a.contribution_margin)
      );

      return {
        category,
        totalDishes: items.length,
        totalOrders,
        totalRevenue,
        totalContributionMargin,
        averageMarginPercent,
        topDish: sortedByMargin[0]?.dish_name || null,
      };
    })
    .sort((a, b) => b.totalContributionMargin - a.totalContributionMargin);
}

function generateRecommendations(
  menuItemAnalysis: MenuItemAnalysis[],
  avgMargin: number
): string[] {
  const recommendations: string[] = [];

  // Analyze by quadrant
  const stars = menuItemAnalysis.filter(
    (item) =>
      getMenuQuadrant(
        item,
        avgMargin,
        calculatePopularityScore(
          item,
          Math.max(...menuItemAnalysis.map((i) => Number(i.total_orders))),
          Math.max(
            ...menuItemAnalysis.map((i) => Number(i.total_guests_served))
          )
        )
      ) === "star"
  );

  const plowhorses = menuItemAnalysis.filter(
    (item) =>
      getMenuQuadrant(
        item,
        avgMargin,
        calculatePopularityScore(
          item,
          Math.max(...menuItemAnalysis.map((i) => Number(i.total_orders))),
          Math.max(
            ...menuItemAnalysis.map((i) => Number(i.total_guests_served))
          )
        )
      ) === "plowhorse"
  );

  const puzzles = menuItemAnalysis.filter(
    (item) =>
      getMenuQuadrant(
        item,
        avgMargin,
        calculatePopularityScore(
          item,
          Math.max(...menuItemAnalysis.map((i) => Number(i.total_orders))),
          Math.max(
            ...menuItemAnalysis.map((i) => Number(i.total_guests_served))
          )
        )
      ) === "puzzle"
  );

  const dogs = menuItemAnalysis.filter(
    (item) =>
      getMenuQuadrant(
        item,
        avgMargin,
        calculatePopularityScore(
          item,
          Math.max(...menuItemAnalysis.map((i) => Number(i.total_orders))),
          Math.max(
            ...menuItemAnalysis.map((i) => Number(i.total_guests_served))
          )
        )
      ) === "dog"
  );

  // Generate recommendations based on quadrants
  if (stars.length > 0) {
    recommendations.push(
      `Continue promoting your ${stars.length} "Star" items - they have high popularity and strong margins.`
    );
  }

  if (plowhorses.length > 0) {
    recommendations.push(
      `Review ${plowhorses.length} "Plowhorse" items with high sales but low margins. Consider strategic price increases or cost optimization.`
    );
  }

  if (puzzles.length > 0) {
    const topPuzzles = puzzles
      .sort((a, b) => Number(b.margin_percent) - Number(a.margin_percent))
      .slice(0, 3)
      .map((p) => p.dish_name)
      .join(", ");
    recommendations.push(
      `${puzzles.length} "Puzzle" items have strong margins but low sales. Feature these prominently: ${topPuzzles}`
    );
  }

  if (dogs.length > 0) {
    recommendations.push(
      `Consider removing or reformulating ${dogs.length} "Dog" items that have low popularity and margins.`
    );
  }

  // Overall margin recommendations
  const lowMarginItems = menuItemAnalysis.filter(
    (item) => Number(item.margin_percent) < 20
  );
  if (lowMarginItems.length > 0) {
    recommendations.push(
      `${lowMarginItems.length} items have margins below 20%. Review portion sizes and ingredient costs.`
    );
  }

  return recommendations;
}

/**
 * GET /api/analytics/menu-engineering
 * Get menu engineering analytics including contribution margin analysis,
 * popularity scoring, and strategic recommendations
 */
export async function GET(request: Request) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30d";
  const locationId = searchParams.get("locationId");

  const dateRange = calculateDateRange(period);

  try {
    const menuItemAnalysis = await fetchMenuItemAnalysis(
      tenantId,
      dateRange.startDate,
      locationId
    );

    const summary = await fetchMenuPerformanceSummary(menuItemAnalysis);

    const maxOrders =
      menuItemAnalysis.length > 0
        ? Math.max(...menuItemAnalysis.map((i) => Number(i.total_orders)))
        : 1;
    const maxGuests =
      menuItemAnalysis.length > 0
        ? Math.max(
            ...menuItemAnalysis.map((i) => Number(i.total_guests_served))
          )
        : 1;

    const menuItems = menuItemAnalysis.map((item) => {
      const popularityScore = calculatePopularityScore(
        item,
        maxOrders,
        maxGuests
      );
      const quadrant = getMenuQuadrant(
        item,
        summary.average_margin_percent,
        popularityScore
      );

      return {
        dishId: item.dish_id,
        dishName: item.dish_name,
        category: item.category,
        pricePerPerson: item.price_per_person,
        costPerPerson: item.cost_per_person,
        totalOrders: Number(item.total_orders),
        totalGuestsServed: Number(item.total_guests_served),
        totalRevenue: Number(item.total_revenue),
        totalCost: Number(item.total_cost),
        contributionMargin: Number(item.contribution_margin),
        marginPercent: Number(item.margin_percent),
        popularityScore,
        quadrant,
      };
    });

    const categoryAnalysis = getCategoryAnalysis(menuItemAnalysis);

    const recommendations = generateRecommendations(
      menuItemAnalysis,
      summary.average_margin_percent
    );

    const quadrantDistribution = {
      star: menuItems.filter((item) => item.quadrant === "star").length,
      plowhorse: menuItems.filter((item) => item.quadrant === "plowhorse")
        .length,
      puzzle: menuItems.filter((item) => item.quadrant === "puzzle").length,
      dog: menuItems.filter((item) => item.quadrant === "dog").length,
    };

    return NextResponse.json({
      summary: {
        period,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.now.toISOString(),
        locationId: locationId || null,
        totalDishes: summary.total_dishes,
        totalOrders: summary.total_orders,
        totalRevenue: summary.total_revenue,
        totalCost: summary.total_cost,
        totalContributionMargin: summary.total_contribution_margin,
        averageMarginPercent: summary.average_margin_percent,
        topPerformingDish: summary.top_performing_dish,
        lowPerformingDish: summary.low_performing_dish,
      },
      menuItems,
      categoryAnalysis,
      recommendations,
      quadrantDistribution,
    });
  } catch (error) {
    console.error("Error fetching menu engineering analytics:", error);
    return NextResponse.json(
      { message: "Failed to fetch menu engineering analytics" },
      { status: 500 }
    );
  }
}
