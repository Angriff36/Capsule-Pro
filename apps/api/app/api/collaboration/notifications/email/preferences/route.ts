/**
 * GET /api/collaboration/notifications/email/preferences
 * POST /api/collaboration/notifications/email/preferences
 *
 * Get or set email notification preferences for an employee
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getEmailPreferences, setEmailPreference } from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const setPreferenceSchema = z.object({
  employeeId: z.string().min(1),
  notificationType: z.string().min(1),
  isEnabled: z.boolean(),
});

/**
 * GET /api/collaboration/notifications/email/preferences
 * Get email notification preferences for an employee
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

    const preferences = await getEmailPreferences(
      database,
      tenantId,
      employeeId
    );

    return NextResponse.json({
      employeeId,
      preferences,
    });
  } catch (error) {
    console.error("Failed to fetch email preferences:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch email preferences: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collaboration/notifications/email/preferences
 * Set email notification preference for an employee
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

    await setEmailPreference(
      database,
      tenantId,
      employeeId,
      notificationType,
      isEnabled
    );

    return NextResponse.json({
      success: true,
      message: `Email preference ${isEnabled ? "enabled" : "disabled"} for ${notificationType}`,
    });
  } catch (error) {
    console.error("Failed to set email preference:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to set email preference: ${message}` },
      { status: 500 }
    );
  }
}
