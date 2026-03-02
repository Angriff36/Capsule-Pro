/**
 * GET /api/integrations/goodshuffle/config
 * POST /api/integrations/goodshuffle/config
 * DELETE /api/integrations/goodshuffle/config
 *
 * Manage Goodshuffle integration configuration
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGoodshuffleClient } from "@/app/lib/goodshuffle-client";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const configSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
  webhookSecret: z.string().optional().nullable(),
  syncEnabled: z.boolean().default(true),
  syncDirection: z.enum(["one_way", "two_way"]).default("one_way"),
  conflictResolution: z
    .enum(["convoy_wins", "goodshuffle_wins", "manual"])
    .default("convoy_wins"),
  autoSyncInterval: z.number().int().min(5).max(1440).optional().nullable(),
});

/**
 * GET /api/integrations/goodshuffle/config
 * Get current Goodshuffle configuration (secrets masked)
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
      select: {
        id: true,
        syncEnabled: true,
        syncDirection: true,
        conflictResolution: true,
        webhookSecret: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        autoSyncInterval: true,
        createdAt: true,
        updatedAt: true,
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
        webhookSecret: config.webhookSecret ? "********" : null,
      },
    });
  } catch (error) {
    console.error("Failed to get Goodshuffle config:", error);
    return NextResponse.json(
      { error: "Failed to get configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/goodshuffle/config
 * Create or update Goodshuffle configuration
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

    const {
      apiKey,
      apiSecret,
      webhookSecret,
      syncEnabled,
      syncDirection,
      conflictResolution,
      autoSyncInterval,
    } = parsed.data;

    // Test the connection before saving
    const client = createGoodshuffleClient({
      apiKey,
      apiSecret,
    });

    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: `Connection test failed: ${connectionTest.message}` },
        { status: 400 }
      );
    }

    // Upsert config
    const config = await database.goodshuffleConfig.upsert({
      where: { tenantId },
      update: {
        apiKey,
        apiSecret,
        webhookSecret: webhookSecret ?? null,
        syncEnabled,
        syncDirection,
        conflictResolution,
        autoSyncInterval: autoSyncInterval ?? null,
      },
      create: {
        tenantId,
        apiKey,
        apiSecret,
        webhookSecret: webhookSecret ?? null,
        syncEnabled,
        syncDirection,
        conflictResolution,
        autoSyncInterval: autoSyncInterval ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        apiKey: maskApiKey(config.apiKey),
        apiSecret: "********",
        webhookSecret: config.webhookSecret ? "********" : null,
      },
    });
  } catch (error) {
    console.error("Failed to save Goodshuffle config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/goodshuffle/config
 * Remove Goodshuffle configuration
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

    await database.goodshuffleConfig.delete({
      where: { tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete Goodshuffle config:", error);
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
