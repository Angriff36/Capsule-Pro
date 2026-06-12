/**
 * Generic Manifest entity detail read route.
 *
 * GET /api/manifest/{entity}/{id}
 *
 * Constitution §10 (Read Path Freedom): reads may bypass Manifest runtime but
 * must preserve tenant isolation. This route provides a uniform, validated read
 * surface for ALL 189 IR entities through the Prisma store layer, with:
 *   - Entity validation against the accessor registry
 *   - Automatic tenant scoping (prevents cross-tenant data access)
 *   - Soft-delete filtering (deletedAt: null)
 *   - Correct field names for raw snake_case models
 *   - Composite-PK entity rejection (ENTITY_DETAIL_DROP)
 */

import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestSuccessResponse,
  manifestErrorResponse,
} from "@/lib/manifest-response";
import {
  resolveEntityAccessor,
  buildTenantWhere,
} from "@/lib/manifest/entity-accessor";

export const dynamic = "force-dynamic";

/** Minimal shape of a Prisma model delegate used by the generic detail route. */
interface PrismaDetailDelegate {
  findFirst: (args: {
    where: Record<string, unknown>;
  }) => Promise<unknown | null>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
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
  const { entity, id } = await params;
  const resolution = resolveEntityAccessor(entity);

  if (resolution.drop || !resolution.exists) {
    return manifestErrorResponse(
      `Entity '${entity}' not found or has no backing table`,
      404
    );
  }

  if (!resolution.hasDetail) {
    return manifestErrorResponse(
      `Entity '${entity}' does not support single-record reads (composite PK)`,
      400
    );
  }

  // ── Query ────────────────────────────────────────────────────
  const model = (await import("@repo/database")).database as unknown as Record<
    string,
    PrismaDetailDelegate
  >;
  const delegate = model[resolution.accessor];
  if (!delegate) {
    return manifestErrorResponse(
      `No Prisma delegate for '${resolution.accessor}'`,
      500
    );
  }

  try {
    const where = buildTenantWhere(entity, tenantId, { id });
    const record = await delegate.findFirst({ where });

    if (!record) {
      return manifestErrorResponse(`${entity} with id '${id}' not found`, 404);
    }

    return manifestSuccessResponse({ data: record });
  } catch (err) {
    console.error(
      `[manifest-read] Error reading ${entity}/${id}:`,
      err instanceof Error ? err.message : err
    );
    return manifestErrorResponse(
      `Failed to read ${entity}: ${err instanceof Error ? err.message : "unknown error"}`,
      500
    );
  }
}
