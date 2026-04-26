// Create facility area
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_TYPES = [
  "kitchen",
  "storage",
  "dining",
  "prep",
  "office",
  "loading_dock",
  "restroom",
  "other",
];

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
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { venueId, name, code, areaType, floor, description, squareFeet } =
      body;

    if (!name) {
      return manifestErrorResponse("name is required", 400);
    }

    const type = VALID_TYPES.includes(areaType) ? areaType : "other";

    if (code) {
      const existing = await database.facilityArea.findFirst({
        where: { tenantId, code, deletedAt: null },
      });
      if (existing) {
        return manifestErrorResponse("Area code already exists", 400);
      }
    }

    const area = await database.facilityArea.create({
      data: {
        tenantId,
        venueId: venueId || null,
        name,
        code: code || null,
        areaType: type,
        floor: floor ?? null,
        description: description || null,
        squareFeet: squareFeet ?? null,
      },
    });

    return manifestSuccessResponse({ area: mapAreaToSnake(area) });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
