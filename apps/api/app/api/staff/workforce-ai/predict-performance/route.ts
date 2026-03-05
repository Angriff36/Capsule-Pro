import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  type PerformancePredictionRequest,
  predictPerformance,
} from "@/lib/staff/workforce-ai-optimizer";

/**
 * POST /api/staff/workforce-ai/predict-performance
 *
 * Generate AI-powered performance predictions for an employee.
 *
 * Body:
 * - employeeId: string - Employee to predict
 * - scheduleId?: string - Optional schedule context
 * - predictionHorizon: number - Days to predict ahead
 * - metrics: Array<"productivity" | "attendance" | "overtime_risk" | "skill_match">
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = await request.json();
    const { employeeId, scheduleId, predictionHorizon, metrics } =
      body as PerformancePredictionRequest;

    if (!(employeeId && predictionHorizon && metrics)) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: employeeId, predictionHorizon, metrics",
        },
        { status: 400 }
      );
    }

    const result = await predictPerformance(tenantId, {
      employeeId,
      scheduleId,
      predictionHorizon,
      metrics,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error predicting performance:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate performance prediction",
      },
      { status: 500 }
    );
  }
}
