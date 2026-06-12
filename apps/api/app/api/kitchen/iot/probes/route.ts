import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { runManifestCommand } from "@/lib/manifest/execute-command";

/**
 * GET /api/kitchen/iot/probes
 * List all IoT temperature probes (read — bypasses Manifest per §10).
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    const where: Record<string, unknown> = { tenantId };
    if (locationId) {
      where.locationId = locationId;
    }

    const probes = await database.temperatureProbe.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ probes });
  } catch (error) {
    captureException(error);
    log.error("List probes error:", error);
    return NextResponse.json(
      { error: "Failed to list probes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/iot/probes
 * Register a new IoT temperature probe via Manifest runtime.
 */
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

    const body = await request.json();
    const { name, probeId, locationId, probeType, minTemp, maxTemp } = body;

    if (!(name && probeId)) {
      return NextResponse.json(
        { error: "Name and probe ID are required" },
        { status: 400 }
      );
    }

    // Delegate creation to Manifest runtime
    return runManifestCommand({
      entity: "TemperatureProbe",
      command: "create",
      body: {
        name,
        probeId,
        locationId: locationId || null,
        probeType: probeType || "bluetooth",
        minTemp: minTemp || -40,
        maxTemp: maxTemp || 300,
        status: "active",
        batteryLevel: 100,
      },
      user: { id: userId, tenantId, role: "" },
    });
  } catch (error) {
    captureException(error);
    log.error("Create probe error:", error);
    return NextResponse.json(
      { error: "Failed to create probe" },
      { status: 500 }
    );
  }
}
