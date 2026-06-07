/**
 * Generic Manifest entity list read route.
 *
 * GET /api/manifest/{entity}?page=1&limit=50
 *
 * Constitution §10 (Read Path Freedom): reads may bypass Manifest runtime but
 * must preserve tenant isolation. This route provides a uniform, validated read
 * surface for ALL 189 IR entities through the Prisma store layer, with:
 *   - Entity validation against the accessor registry
 *   - Automatic tenant scoping
 *   - Soft-delete filtering
 *   - Pagination
 *   - Correct field names for raw snake_case models
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestSuccessResponse,
  manifestErrorResponse,
} from "@/lib/manifest-response";
import {
  resolveEntityAccessor,
  buildTenantWhere,
  buildOrderBy,
} from "@/lib/manifest/entity-accessor";

export const dynamic = "force-dynamic";

/** Minimal shape of a Prisma model delegate used by the generic list route. */
interface PrismaListDelegate {
  findMany: (args: {
    where: Record<string, unknown>;
    skip: number;
    take: number;
    orderBy?: Record<string, unknown>;
  }) => Promise<unknown[]>;
  count: (args: { where: Record<string, unknown> }) => Promise<number>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────
  let tenantId: string;
  try {
    const user = await requireCurrentUser();
    tenantId = user.tenantId;
  } catch {
    return manifestErrorResponse("Authentication required", 401);
  }

  // ── Resolve entity ───────────────────────────────────────────
  const { entity } = await params;
  const resolution = resolveEntityAccessor(entity);

  if (resolution.drop || !resolution.exists) {
    return manifestErrorResponse(
      `Entity '${entity}' not found or has no backing table`,
      404,
    );
  }

  // ── Pagination ───────────────────────────────────────────────
  const url = new URL(_request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit")) || 50),
  );
  const skip = (page - 1) * limit;

  // ── Build query ──────────────────────────────────────────────
  const model = (await import("@repo/database")).database as unknown as Record<string, PrismaListDelegate>;
  const delegate = model[resolution.accessor];
  if (!delegate) {
    return manifestErrorResponse(
      `No Prisma delegate for '${resolution.accessor}'`,
      500,
    );
  }

  try {
    const where = buildTenantWhere(entity, tenantId);
    const orderBy = buildOrderBy(entity);

    // Run count + data in parallel for efficiency
    const [total, data] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        ...(Object.keys(orderBy).length > 0 ? { orderBy } : {}),
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return manifestSuccessResponse({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error(
      `[manifest-read] Error listing ${entity}:`,
      err instanceof Error ? err.message : err,
    );
    return manifestErrorResponse(
      `Failed to list ${entity}: ${err instanceof Error ? err.message : "unknown error"}`,
      500,
    );
  }
}
