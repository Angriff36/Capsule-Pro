// Create vehicle
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  plateNumber: string | null;
  vin: string | null;
  capacityWeight: { toNumber(): number } | null;
  capacityVolume: { toNumber(): number } | null;
  fuelType: string | null;
  mileage: { toNumber(): number } | null;
  status: string;
  notes: string | null;
  createdAt: Date;
};

function mapVehicleToSnake(v: VehicleRow) {
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    plate_number: v.plateNumber,
    vin: v.vin,
    capacity_weight: v.capacityWeight?.toNumber?.() ?? null,
    capacity_volume: v.capacityVolume?.toNumber?.() ?? null,
    fuel_type: v.fuelType,
    mileage: v.mileage?.toNumber?.() ?? null,
    status: v.status,
    notes: v.notes,
    created_at: v.createdAt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const {
      make,
      model,
      year,
      plateNumber,
      vin,
      capacityWeight,
      capacityVolume,
      fuelType,
      notes,
    } = body;

    if (!(make && model))
      return manifestErrorResponse("make and model are required", 400);

    const vehicle = await database.vehicle.create({
      data: {
        tenantId,
        make,
        model,
        year: year ?? null,
        plateNumber: plateNumber ?? null,
        vin: vin ?? null,
        capacityWeight: capacityWeight ?? null,
        capacityVolume: capacityVolume ?? null,
        fuelType: fuelType ?? null,
        status: "available",
        notes: notes ?? null,
      },
    });

    return manifestSuccessResponse({ vehicle: mapVehicleToSnake(vehicle) });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
