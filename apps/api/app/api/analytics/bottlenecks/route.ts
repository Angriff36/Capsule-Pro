import { auth } from "@repo/auth/server";
// Read-only OLAP queries route to the Neon read replica when
// ANALYTICS_DATABASE_URL is set (else primary). Aliased as `database` so the
// query call sites stay unchanged. See packages/database/analytics-database.ts.
import { analyticsDatabase as database } from "@repo/database";
import type { BottleneckAnalysis } from "@repo/manifest-runtime/bottleneck-detector";
import {
  BottleneckCategory,
  createBottleneckDetector,
} from "@repo/manifest-runtime/bottleneck-detector";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/analytics/bottlenecks
 *
 * Analyze operational bottlenecks and generate AI-powered improvement suggestions.
 *
 * Query parameters:
 * - period: Analysis period (7d, 30d, 90d, 12m) - default: 30d
 * - category: Filter by category (optional)
 * - locationId: Filter by location (optional)
 * - useAi: Enable AI suggestions (default: true)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const period = searchParams.get("period") || "30d";
  const category = searchParams.get("category");
  const locationId = searchParams.get("locationId");
  const useAi = searchParams.get("useAi") !== "false";

  try {
    // Create detector with configuration
    const detector = createBottleneckDetector(database, {
      enabled: true,
      aiEnabled: useAi,
      detectionWindow: period,
      sampleRate: 1.0,
    });

    let analysis: BottleneckAnalysis;

    // Filter by category if specified
    if (category) {
      const bottlenecks = await detector.detectByCategory(
        tenantId,
        category as BottleneckCategory,
        locationId || undefined
      );

      analysis = {
        tenantId,
        analysisPeriod: {
          start: new Date(Date.now() - getPeriodMs(period)),
          end: new Date(),
        },
        bottlenecks,
        summary: {
          total: bottlenecks.length,
          bySeverity: bottlenecks.reduce(
            (acc: Record<string, number>, b) => {
              acc[b.severity] = (acc[b.severity] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          byCategory: {
            ...createEmptyCategoryCounts(),
            [category as BottleneckCategory]: bottlenecks.length,
          },
          topAffectedEntities: [],
        },
        healthScore: {
          overall: bottlenecks.length > 0 ? 70 : 100,
          byCategory: {
            ...createEmptyCategoryCounts(100),
            [category as BottleneckCategory]: bottlenecks.length > 0 ? 70 : 100,
          },
        },
        analyzedAt: new Date(),
      };
    } else {
      // Run full analysis
      analysis = await detector.analyze(tenantId, locationId || undefined);
    }

    // Format response
    const response = {
      meta: {
        period,
        startDate: analysis.analysisPeriod.start.toISOString(),
        endDate: analysis.analysisPeriod.end.toISOString(),
        locationId: locationId || null,
      },
      healthScore: analysis.healthScore,
      summary: analysis.summary,
      bottlenecks: analysis.bottlenecks.map((b) => ({
        id: b.id,
        category: b.category,
        type: b.type,
        severity: b.severity,
        title: b.title,
        description: b.description,
        affectedEntity: b.affectedEntity,
        metrics: b.metrics,
        suggestion: b.suggestion
          ? {
              id: b.suggestion.id,
              type: b.suggestion.type,
              priority: b.suggestion.priority,
              title: b.suggestion.title,
              description: b.suggestion.description,
              reasoning: b.suggestion.reasoning,
              estimatedImpact: b.suggestion.estimatedImpact,
              implementation: b.suggestion.implementation,
              steps: b.suggestion.steps,
              aiGenerated: b.suggestion.aiGenerated,
            }
          : null,
        detectedAt: b.detectedAt.toISOString(),
      })),
      analyzedAt: analysis.analyzedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error analyzing bottlenecks:", error);
    return NextResponse.json(
      {
        message: "Failed to analyze bottlenecks",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Build a fully-populated category map with every BottleneckCategory key,
 * initialized to `value` (defaults to 0). Required so the partial
 * category-filtered result still satisfies Record<BottleneckCategory, number>.
 */
function createEmptyCategoryCounts(
  value = 0
): Record<BottleneckCategory, number> {
  return Object.values(BottleneckCategory).reduce(
    (acc, key) => {
      acc[key] = value;
      return acc;
    },
    {} as Record<BottleneckCategory, number>
  );
}

/**
 * Convert period string to milliseconds
 */
function getPeriodMs(period: string): number {
  const match = period.match(/^(\d+)([dhm])$/);
  if (!match) {
    return 30 * 24 * 60 * 60 * 1000; // Default to 30 days
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}
