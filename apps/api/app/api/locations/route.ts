import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const locations = await database.location.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(isActive === "true" ? { isActive: true } : {}),
      },
      orderBy: { name: "asc" },
    });
    const locationsList = locations.map((location) => ({
      id: location.id,
      name: location.name,
      address_line_1: location.addressLine1,
      address_line_2: location.addressLine2,
      city: location.city,
      state_province: location.stateProvince,
      postal_code: location.postalCode,
      country_code: location.countryCode,
      timezone: location.timezone,
      is_primary: location.isPrimary,
      is_active: location.isActive,
      created_at: location.createdAt,
      updated_at: location.updatedAt,
    }));

    return NextResponse.json({ locations: locationsList });
  } catch (error) {
    captureException(error);
    log.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
