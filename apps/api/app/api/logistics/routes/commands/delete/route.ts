import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const { routeId } = await request.json();
    if (!routeId) {
      return NextResponse.json(
        { error: "routeId is required" },
        { status: 400 },
      );
    }

    const existing = await database.deliveryRoute.findUnique({
      where: { tenantId_id: { tenantId, id: routeId } },
      select: { id: true, deletedAt: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 },
      );
    }

    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Route already deleted" },
        { status: 400 },
      );
    }

    await database.deliveryRoute.update({
      where: { tenantId_id: { tenantId, id: routeId } },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    captureException(error);
    log.error("Error deleting route:", error);
    return NextResponse.json(
      { error: "Failed to delete route" },
      { status: 500 },
    );
  }
}
