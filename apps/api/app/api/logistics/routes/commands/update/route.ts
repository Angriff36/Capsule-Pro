import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body = await request.json();
    const {
      routeId,
      name,
      description,
      eventId,
      scheduledDate,
      startTime,
      endTime,
      driverId,
      vehicleId,
    } = body;

    if (!routeId) {
      return NextResponse.json(
        { error: "routeId is required" },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (eventId !== undefined) data.eventId = eventId;
    if (scheduledDate !== undefined)
      data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (startTime !== undefined)
      data.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined)
      data.endTime = endTime ? new Date(endTime) : null;
    if (driverId !== undefined) data.driverId = driverId;
    if (vehicleId !== undefined) data.vehicleId = vehicleId;

    const route = await database.deliveryRoute.update({
      where: { tenantId_id: { tenantId, id: routeId } },
      data,
    });

    return NextResponse.json({ route });
  } catch (error) {
    captureException(error);
    log.error("Error updating route:", error);
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 },
    );
  }
}
