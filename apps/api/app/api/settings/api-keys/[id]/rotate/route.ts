/**
 * API Key Rotate Endpoint
 *
 * POST /api/settings/api-keys/:id/rotate - Rotate (regenerate) an API key
 */

import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/app/lib/api-key-service";
import { requireCurrentUser } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";

/**
 * POST /api/settings/api-keys/:id/rotate
 * Rotate (regenerate) an API key
 *
 * Generates a new key and updates the hashed key and prefix.
 * Returns the new plain key (only time it's shown).
 * Useful for key rotation without changing other properties.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await requireCurrentUser();
    const { id } = await context.params;

    // Check if key exists and belongs to tenant
    const existing = await database.apiKey.findUnique({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id,
        },
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { message: "API key not found" },
        { status: 404 }
      );
    }

    if (existing.revokedAt) {
      return NextResponse.json(
        { message: "Cannot rotate a revoked API key" },
        { status: 400 }
      );
    }

    // Generate a new API key
    const { plainKey, hashedKey, keyPrefix } = generateApiKey();

    // Update the key with new hashed key and prefix
    const updated = await database.apiKey.update({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id,
        },
      },
      data: {
        hashedKey,
        keyPrefix,
        // Clear revokedAt if it was set (shouldn't be, but just in case)
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log("[ApiKeys/rotate] Rotated API key", {
      tenantId: currentUser.tenantId,
      keyId: id,
      userId: currentUser.id,
    });

    // Return the key WITH the new plain key (only time it's shown)
    return NextResponse.json({
      ...updated,
      plainKey, // Only returned on rotation
    });
  } catch (error) {
    console.error("[ApiKeys/rotate] Error:", error);
    return NextResponse.json(
      { message: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}
