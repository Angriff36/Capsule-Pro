import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createBottleneckDetector } from "@repo/manifest-adapters";
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

    let analysis;

    // Filter by category if specified
    if (category) {
      const bottlenecks = await detector.detectByCategory(
        tenantId,
        category as any,
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
            (acc, b) => {
              acc[b.severity] = (acc[b.severity] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          byCategory: { [category]: bottlenecks.length },
          topAffectedEntities: [],
        },
        healthScore: {
          overall: bottlenecks.length > 0 ? 70 : 100,
          byCategory: {
            [category]: bottlenecks.length > 0 ? 70 : 100,
          } as Record<string, number>,
        },
        analyzedAt: new Date(),
      };
    } else {
      // Run full analysis
      analysis = await detector.analyze(tenantId, locationId || undefined);
    }

    // Format response
    const response = {
      summary: {
        period,
        startDate: analysis.analysisPeriod.start.toISOString(),
        endDate: analysis.analysisPeriod.end.toISOString(),
        locationId: locationId || null,
      },
      healthScore: analysis.healthScore,
      bottleneckSummary: analysis.summary,
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
