/**
 * API Key Detail Endpoint
 *
 * GET /api/settings/api-keys/:id - Get a single API key by ID
 * PUT /api/settings/api-keys/:id - Update an API key (Manifest runtime)
 * DELETE /api/settings/api-keys/:id - Soft delete an API key (Manifest runtime)
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { withRateLimit } from "@/middleware/rate-limiter";

export const runtime = "nodejs";

/**
 * GET /api/settings/api-keys/:id
 * Get a single API key by ID (excluding hashed key for security)
 */
export const GET = withRateLimit(
  async (_request, context) => {
    try {
      const currentUser = await requireCurrentUser();
      const params = await context.params;
      if (!params) {
        return NextResponse.json(
          { message: "Invalid request" },
          { status: 400 }
        );
      }
      const id = String(params.id);

      const apiKey = await database.apiKey.findFirst({
        where: {
          tenantId: currentUser.tenantId,
          id,
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
      captureException(error);
      log.error("[ApiKeys/detail] Error", { error });
      return NextResponse.json(
        { message: "Failed to fetch API key" },
        { status: 500 }
      );
    }
  },
  { limit: 60, window: "1m" }
);

/**
 * PUT /api/settings/api-keys/:id
 * Update an API key (name, scopes, expiresAt) — delegated to Manifest runtime
 *
 * Body: { name?: string, scopes?: string[], expiresAt?: string | null }
 */
export const PUT = withRateLimit(
  async (request, context) => {
    try {
      const currentUser = await requireCurrentUser();
      const params = await context.params;
      if (!params) {
        return NextResponse.json(
          { message: "Invalid request" },
          { status: 400 }
        );
      }
      const id = String(params.id);

      // Check if key exists and belongs to tenant
      const existing = await database.apiKey.findFirst({
        where: {
          tenantId: currentUser.tenantId,
          id,
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

      // Build update data for duplicate-name check
      if (name !== undefined && name !== existing.name) {
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

      if (
        name === undefined &&
        scopes === undefined &&
        expiresAt === undefined
      ) {
        return NextResponse.json(
          { message: "No fields to update" },
          { status: 400 }
        );
      }

      // Delegate update to Manifest runtime
      return runManifestCommand({
        entity: "ApiKey",
        command: "update",
        body: {
          id,
          ...(name === undefined ? {} : { name }),
          ...(scopes === undefined
            ? {}
            : { scopes: Array.isArray(scopes) ? scopes : [] }),
          ...(expiresAt === undefined
            ? {}
            : { expiresAt: expiresAt ? new Date(expiresAt as string) : null }),
          tenantId: currentUser.tenantId,
        },
        user: {
          id: currentUser.id,
          tenantId: currentUser.tenantId,
          role: currentUser.role,
        },
      });
    } catch (error) {
      captureException(error);
      log.error("[ApiKeys/update] Error", { error });
      return NextResponse.json(
        { message: "Failed to update API key" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);

/**
 * DELETE /api/settings/api-keys/:id
 * Soft delete an API key — delegated to Manifest runtime
 */
export const DELETE = withRateLimit(
  async (_request, context) => {
    try {
      const currentUser = await requireCurrentUser();
      const params = await context.params;
      if (!params) {
        return NextResponse.json(
          { message: "Invalid request" },
          { status: 400 }
        );
      }
      const id = String(params.id);

      // Check if key exists and belongs to tenant
      const existing = await database.apiKey.findFirst({
        where: {
          tenantId: currentUser.tenantId,
          id,
        },
      });

      if (!existing || existing.deletedAt) {
        return NextResponse.json(
          { message: "API key not found" },
          { status: 404 }
        );
      }

      // Delegate soft-delete to Manifest runtime
      return runManifestCommand({
        entity: "ApiKey",
        command: "softDelete",
        body: {
          id,
          tenantId: currentUser.tenantId,
        },
        user: {
          id: currentUser.id,
          tenantId: currentUser.tenantId,
          role: currentUser.role,
        },
      });
    } catch (error) {
      captureException(error);
      log.error("[ApiKeys/delete] Error", { error });
      return NextResponse.json(
        { message: "Failed to delete API key" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
