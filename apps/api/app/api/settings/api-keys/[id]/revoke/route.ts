/**
 * API Key Revoke Endpoint
 *
 * POST /api/settings/api-keys/:id/revoke - Revoke an API key
 */

import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";

/**
 * POST /api/settings/api-keys/:id/revoke
 * Revoke an API key (sets revokedAt timestamp)
 *
 * Unlike soft delete, revocation is for security purposes (compromised key).
 * A revoked key cannot be used for authentication.
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
        { message: "API key is already revoked" },
        { status: 400 }
      );
    }

    // Revoke the key
    const revoked = await database.apiKey.update({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id,
        },
      },
      data: {
        revokedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        revokedAt: true,
      },
    });

    console.log("[ApiKeys/revoke] Revoked API key", {
      tenantId: currentUser.tenantId,
      keyId: id,
      userId: currentUser.id,
    });

    return NextResponse.json(revoked);
  } catch (error) {
    console.error("[ApiKeys/revoke] Error:", error);
    return NextResponse.json(
      { message: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
