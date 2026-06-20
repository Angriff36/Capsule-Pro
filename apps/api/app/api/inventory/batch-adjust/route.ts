/**
 * Batch inventory quantity adjustment across multiple items/locations.
 *
 * POST /api/inventory/batch-adjust
 * { adjustments: [{ itemId, delta, reason }] }
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

interface AdjustmentLine {
  delta: number;
  itemId: string;
  reason: string;
}

function isValidPayload(
  body: unknown
): body is { adjustments: AdjustmentLine[] } {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.adjustments) || b.adjustments.length === 0) {
    return false;
  }
  return b.adjustments.every(
    (line) =>
      typeof line === "object" &&
      line !== null &&
      typeof (line as AdjustmentLine).itemId === "string" &&
      typeof (line as AdjustmentLine).delta === "number" &&
      typeof (line as AdjustmentLine).reason === "string" &&
      (line as AdjustmentLine).reason.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    if (!isValidPayload(body)) {
      return NextResponse.json(
        {
          message:
            "Expected { adjustments: [{ itemId, delta, reason }] } with at least one line",
        },
        { status: 400 }
      );
    }

    const user = await resolveCurrentUser(request);
    const userCtx = { id: user.id, tenantId: user.tenantId, role: user.role };
    const itemIds = body.adjustments.map((a) => a.itemId);

    const existing = await database.inventoryItem.findMany({
      where: { tenantId, id: { in: itemIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    const existingIds = new Set(existing.map((i) => i.id));
    const missing = itemIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { message: `Items not found: ${missing.join(", ")}` },
        { status: 404 }
      );
    }

    const results: Array<{
      itemId: string;
      ok: boolean;
      message?: string;
    }> = [];

    for (const line of body.adjustments) {
      if (line.delta === 0) {
        results.push({ itemId: line.itemId, ok: true });
        continue;
      }

      const adjustResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "InventoryItem",
          command: "adjust",
          body: {
            quantity: line.delta,
            reason: line.reason,
            userId: user.id,
          },
          user: userCtx,
          instanceId: line.itemId,
        }
      );

      results.push({
        itemId: line.itemId,
        ok: adjustResult.ok,
        message: adjustResult.ok ? undefined : adjustResult.message,
      });

      if (!adjustResult.ok) {
        log.error("Batch adjust failed for item", {
          itemId: line.itemId,
          message: adjustResult.message,
        });
      }
    }

    const failed = results.filter((r) => !r.ok);
    const succeeded = results.filter((r) => r.ok);

    return NextResponse.json({
      success: failed.length === 0,
      adjusted: succeeded.length,
      failed: failed.length,
      results,
    });
  } catch (error) {
    captureException(error);
    log.error("[InventoryBatchAdjust/POST] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
