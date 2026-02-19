/**
 * POST /api/integrations/goodshuffle/test
 *
 * Test Goodshuffle API connection
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGoodshuffleClient } from "@/app/lib/goodshuffle-client";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const testSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
});

/**
 * POST /api/integrations/goodshuffle/test
 * Test Goodshuffle API connection with provided credentials
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

    const { apiKey, apiSecret } = parsed.data;

    const client = createGoodshuffleClient({
      apiKey,
      apiSecret,
    });

    const result = await client.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to test Goodshuffle connection:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/goodshuffle/test
 * Test Goodshuffle API connection with saved credentials
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

    const config = await database.goodshuffleConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return NextResponse.json({
        success: false,
        message: "Goodshuffle integration not configured",
      });
    }

    const client = createGoodshuffleClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
    });

    const result = await client.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to test Goodshuffle connection:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}
