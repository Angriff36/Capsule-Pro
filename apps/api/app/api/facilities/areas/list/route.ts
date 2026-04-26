// List facility areas
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

function mapAreaToSnake(a: {
  id: string;
  venueId: string | null;
  name: string;
  code: string | null;
  areaType: string;
  floor: string | null;
  description: string | null;
  squareFeet: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: a.id,
    venue_id: a.venueId,
    name: a.name,
    code: a.code,
    area_type: a.areaType,
    floor: a.floor,
    description: a.description,
    square_feet: a.squareFeet,
    status: a.status,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const venueId = searchParams.get("venueId");
    const areaType = searchParams.get("areaType");
    const status = searchParams.get("status") || "active";

    const areas = await database.facilityArea.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(venueId && { venueId }),
        ...(areaType && { areaType }),
        ...(status !== "all" && { status }),
      },
      orderBy: { name: "asc" },
    });

    return manifestSuccessResponse({ areas: areas.map(mapAreaToSnake) });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
