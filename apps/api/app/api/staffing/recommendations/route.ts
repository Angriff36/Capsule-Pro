import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface StaffingRecommendationRequest {
  guestCount?: number;
  eventType?: string;
  serviceStyle?: string;
  duration?: number;
}

interface StaffRole {
  role: string;
  count: number;
  hourlyRate: number;
  hoursNeeded: number;
  notes: string;
}

const SERVICE_STYLE_MULTIPLIERS: Record<string, number> = {
  plated: 1.2,
  buffet: 1,
  family_style: 1.1,
  cocktail: 0.9,
  food_truck: 0.75,
};

function buildRoles(
  totalStaff: number,
  duration: number,
  serviceStyle: string
): StaffRole[] {
  let serviceNotes = "Balanced service coverage";
  if (serviceStyle === "plated") {
    serviceNotes = "Higher table service coverage recommended";
  } else if (serviceStyle === "cocktail") {
    serviceNotes = "Lean service team with stronger bar support";
  }

  return [
    {
      role: "captain",
      count: Math.max(1, Math.ceil(totalStaff * 0.1)),
      hourlyRate: 32,
      hoursNeeded: duration,
      notes: "Lead floor coordination",
    },
    {
      role: "server",
      count: Math.max(2, Math.ceil(totalStaff * 0.45)),
      hourlyRate: 24,
      hoursNeeded: duration,
      notes: serviceNotes,
    },
    {
      role: "bartender",
      count: Math.max(1, Math.ceil(totalStaff * 0.15)),
      hourlyRate: 26,
      hoursNeeded: duration,
      notes: "Adjust based on beverage package complexity",
    },
    {
      role: "culinary_support",
      count: Math.max(1, Math.ceil(totalStaff * 0.3)),
      hourlyRate: 22,
      hoursNeeded: duration,
      notes: "Supports kitchen output and replenishment",
    },
  ];
}

function buildNotes(
  guestCount: number,
  eventType: string,
  serviceStyle: string
): string[] {
  return [
    `${eventType[0]?.toUpperCase() ?? "E"}${eventType.slice(1)} staffing model generated for ${guestCount} guests.`,
    `${serviceStyle.replace(/_/g, " ")} service typically requires tighter pacing during peak service windows.`,
    "Review setup and breakdown labor separately if venue access is limited.",
  ];
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = (await request.json()) as StaffingRecommendationRequest;
    const guestCount = Number(body.guestCount ?? 0);
    const eventType = body.eventType?.trim() || "corporate";
    const serviceStyle = body.serviceStyle?.trim() || "plated";
    const duration = Number(body.duration ?? 4);

    if (!Number.isFinite(guestCount) || guestCount <= 0) {
      return NextResponse.json(
        { error: "Guest count is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        { error: "Duration must be greater than 0" },
        { status: 400 }
      );
    }

    const serviceMultiplier = SERVICE_STYLE_MULTIPLIERS[serviceStyle] ?? 1;
    const baseStaff = Math.max(3, Math.ceil(guestCount / 18));
    const totalStaff = Math.ceil(baseStaff * serviceMultiplier);
    const roles = buildRoles(totalStaff, duration, serviceStyle);
    const totalLaborCost = roles.reduce(
      (sum, role) => sum + role.count * role.hourlyRate * role.hoursNeeded,
      0
    );

    return NextResponse.json({
      recommendation: {
        eventType,
        guestCount,
        totalStaff,
        totalLaborCost,
        roles,
        notes: buildNotes(guestCount, eventType, serviceStyle),
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Staffing recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to generate staffing recommendations" },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json(
    { error: "Use POST to generate staffing recommendations" },
    { status: 405 }
  );
}
