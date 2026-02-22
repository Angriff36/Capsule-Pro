/**
 * GET /api/integrations/nowsta/config
 * POST /api/integrations/nowsta/config
 *
 * Manage Nowsta integration configuration
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createNowstaClient } from "@/app/lib/nowsta-client";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const configSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
  organizationId: z.string().optional().nullable(),
  syncEnabled: z.boolean().default(true),
  syncDirection: z.enum(["one_way", "two_way"]).default("one_way"),
  autoSyncInterval: z.number().int().min(5).max(1440).optional().nullable(),
});

/**
 * GET /api/integrations/nowsta/config
 * Get current Nowsta configuration (secrets masked)
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
      select: {
        id: true,
        syncEnabled: true,
        syncDirection: true,
        organizationId: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        autoSyncInterval: true,
        createdAt: true,
        updatedAt: true,
        // Mask sensitive fields
        apiKey: true,
      },
    });

    if (!config) {
      return NextResponse.json({
        configured: false,
        config: null,
      });
    }

    // Return with masked API key
    return NextResponse.json({
      configured: true,
      config: {
        ...config,
        apiKey: maskApiKey(config.apiKey),
        apiSecret: "********", // Never expose secret
      },
    });
  } catch (error) {
    console.error("Failed to get Nowsta config:", error);
    return NextResponse.json(
      { error: "Failed to get configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/nowsta/config
 * Create or update Nowsta configuration
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
    const parsed = configSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { apiKey, apiSecret, organizationId, ...rest } = parsed.data;

    // Test the connection before saving
    const client = createNowstaClient({
      apiKey,
      apiSecret,
      organizationId: organizationId ?? null,
    });

    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: `Connection test failed: ${connectionTest.message}` },
        { status: 400 }
      );
    }

    // Upsert config
    const config = await database.nowstaConfig.upsert({
      where: { tenantId },
      update: {
        apiKey,
        apiSecret,
        organizationId: organizationId ?? null,
        ...rest,
      },
      create: {
        tenantId,
        apiKey,
        apiSecret,
        organizationId: organizationId ?? null,
        ...rest,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        apiKey: maskApiKey(config.apiKey),
        apiSecret: "********",
      },
    });
  } catch (error) {
    console.error("Failed to save Nowsta config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/nowsta/config
 * Remove Nowsta configuration
 */
export async function DELETE() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    await database.nowstaConfig.delete({
      where: { tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete Nowsta config:", error);
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "****";
  }
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
