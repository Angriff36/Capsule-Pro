// List drivers with optional status filter and pagination clamps.
// Pagination policy is centralized in `@/lib/pagination` so a hostile or
// buggy client cannot request the entire drivers table in one round trip.
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { clampLimit, clampOffset } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const where = {
      tenantId,
      deletedAt: null as string | null,
      ...(status && status !== "all" ? { status } : {}),
    };

    const drivers = await database.driver.findMany({
      where,
      include: {
        vehicle: {
          select: { make: true, model: true, plateNumber: true },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    });

    // Shape to match the original raw SQL response format
    const shaped = drivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      email: d.email,
      license_number: d.licenseNumber,
      license_expiry: d.licenseExpiry,
      status: d.status,
      vehicle_id: d.vehicleId,
      notes: d.notes,
      created_at: d.createdAt,
      vehicle_name: d.vehicle
        ? `${d.vehicle.make} ${d.vehicle.model}`
        : null,
      plate_number: d.vehicle?.plateNumber ?? null,
    }));

    return manifestSuccessResponse({ drivers: shaped, limit, offset });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
