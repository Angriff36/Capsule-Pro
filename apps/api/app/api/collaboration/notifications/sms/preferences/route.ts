/**
 * GET /api/collaboration/notifications/sms/preferences
 * POST /api/collaboration/notifications/sms/preferences
 *
 * Get or set SMS notification preferences for an employee
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getSmsPreferences, setSmsPreference } from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const setPreferenceSchema = z.object({
  employeeId: z.string().min(1),
  notificationType: z.string().min(1),
  isEnabled: z.boolean(),
});

/**
 * GET /api/collaboration/notifications/sms/preferences
 * Get SMS notification preferences for an employee
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId query parameter is required" },
        { status: 400 }
      );
    }

    const preferences = await getSmsPreferences(database, tenantId, employeeId);

    return NextResponse.json({
      employeeId,
      preferences,
    });
  } catch (error) {
    console.error("Failed to fetch SMS preferences:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch SMS preferences: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collaboration/notifications/sms/preferences
 * Set SMS notification preference for an employee
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = setPreferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { employeeId, notificationType, isEnabled } = parsed.data;

    await setSmsPreference(
      database,
      tenantId,
      employeeId,
      notificationType,
      isEnabled
    );

    return NextResponse.json({
      success: true,
      message: `SMS preference ${isEnabled ? "enabled" : "disabled"} for ${notificationType}`,
    });
  } catch (error) {
    console.error("Failed to set SMS preference:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to set SMS preference: ${message}` },
      { status: 500 }
    );
  }
}
