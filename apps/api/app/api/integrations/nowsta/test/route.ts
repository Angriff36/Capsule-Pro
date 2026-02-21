/**
 * POST /api/integrations/nowsta/test
 *
 * Test Nowsta API connection
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createNowstaClient } from "@/app/lib/nowsta-client";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const testSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
  organizationId: z.string().optional().nullable(),
});

/**
 * POST /api/integrations/nowsta/test
 * Test Nowsta API connection without saving
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
    const parsed = testSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { apiKey, apiSecret, organizationId } = parsed.data;

    const client = createNowstaClient({
      apiKey,
      apiSecret,
      organizationId: organizationId ?? null,
    });

    const result = await client.testConnection();

    if (result.success) {
      // Try to fetch employees to verify permissions
      try {
        const { total } = await client.getEmployees({
          limit: 1,
          isActive: true,
        });

        return NextResponse.json({
          success: true,
          message: "Connection successful",
          hasEmployees: total > 0,
          employeeCount: total,
        });
      } catch {
        return NextResponse.json({
          success: true,
          message: "Connection successful, but could not fetch employees",
          hasEmployees: false,
          warning: "Check API permissions for employee access",
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: result.message,
    });
  } catch (error) {
    console.error("Nowsta connection test failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Connection test failed: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/nowsta/test
 * Test connection using saved configuration
 */
export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const config = await database.nowstaConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return NextResponse.json({
        success: false,
        message: "Nowsta integration not configured",
        configured: false,
      });
    }

    const client = createNowstaClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      organizationId: config.organizationId,
    });

    const result = await client.testConnection();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      configured: true,
    });
  } catch (error) {
    console.error("Nowsta connection test failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Connection test failed: ${message}` },
      { status: 500 }
    );
  }
}
