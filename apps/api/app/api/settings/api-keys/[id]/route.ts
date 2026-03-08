/**
 * API Key Detail Endpoint
 *
 * GET /api/settings/api-keys/:id - Get a single API key by ID
 * PUT /api/settings/api-keys/:id - Update an API key
 * DELETE /api/settings/api-keys/:id - Soft delete an API key
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
 * GET /api/settings/api-keys/:id
 * Get a single API key by ID (excluding hashed key for security)
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requireCurrentUser();
    const { id } = await context.params;

    const apiKey = await database.apiKey.findUnique({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id,
        },
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude hashedKey for security
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { message: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(apiKey);
  } catch (error) {
    console.error("[ApiKeys/detail] Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch API key" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/api-keys/:id
 * Update an API key (name, scopes, expiresAt)
 *
 * Body: { name?: string, scopes?: string[], expiresAt?: string | null }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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
        { message: "Cannot update a revoked API key" },
        { status: 400 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body
    }

    const { name, scopes, expiresAt } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      // Check for duplicate name if name is being changed
      if (name !== existing.name) {
        const duplicate = await database.apiKey.findFirst({
          where: {
            tenantId: currentUser.tenantId,
            name: name as string,
            deletedAt: null,
            NOT: { id },
          },
        });

        if (duplicate) {
          return NextResponse.json(
            { message: "An API key with this name already exists" },
            { status: 409 }
          );
        }
      }
      updateData.name = name;
    }

    if (scopes !== undefined) {
      updateData.scopes = Array.isArray(scopes) ? scopes : [];
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt as string) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await database.apiKey.update({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id,
        },
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log("[ApiKeys/update] Updated API key", {
      tenantId: currentUser.tenantId,
      keyId: id,
      userId: currentUser.id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ApiKeys/update] Error:", error);
    return NextResponse.json(
      { message: "Failed to update API key" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/api-keys/:id
 * Soft delete an API key
 */
export async function DELETE(_request: Request, context: RouteContext) {
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

    // Soft delete
    await database.apiKey.update({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log("[ApiKeys/delete] Soft deleted API key", {
      tenantId: currentUser.tenantId,
      keyId: id,
      userId: currentUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ApiKeys/delete] Error:", error);
    return NextResponse.json(
      { message: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
