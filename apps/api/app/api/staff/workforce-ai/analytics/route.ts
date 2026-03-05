import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  generateWorkforceAnalytics,
  type WorkforceAnalyticsData,
} from "@/lib/staff/workforce-ai-optimizer";

/**
 * GET /api/staff/workforce-ai/analytics
 *
 * Generate comprehensive workforce analytics for a period.
 *
 * Query params:
 * - locationId?: string - Optional location filter
 * - startDate: string (ISO 8601) - Start of analytics period
 * - endDate: string (ISO 8601) - End of analytics period
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const locationId = searchParams.get("locationId") || undefined;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!(startDate && endDate)) {
    return NextResponse.json(
      { message: "Missing required query params: startDate, endDate" },
      { status: 400 }
    );
  }

  try {
    const result = await generateWorkforceAnalytics(tenantId, {
      locationId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating workforce analytics:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate workforce analytics",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff/workforce-ai/analytics
 *
 * Generate comprehensive workforce analytics for a period (POST for complex queries).
 *
 * Body:
 * - locationId?: string - Optional location filter
 * - startDate: string (ISO 8601) - Start of analytics period
 * - endDate: string (ISO 8601) - End of analytics period
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = await request.json();
    const { locationId, startDate, endDate } =
      body as WorkforceAnalyticsData & {
        startDate: string;
        endDate: string;
      };

    if (!(startDate && endDate)) {
      return NextResponse.json(
        { message: "Missing required fields: startDate, endDate" },
        { status: 400 }
      );
    }

    const result = await generateWorkforceAnalytics(tenantId, {
      locationId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating workforce analytics:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate workforce analytics",
      },
      { status: 500 }
    );
  }
}
