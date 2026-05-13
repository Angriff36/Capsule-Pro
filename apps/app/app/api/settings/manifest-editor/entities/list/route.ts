import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { listKitchenEntities } from "@/app/lib/manifest-editor/kitchen-ir";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedLimit = Number(searchParams.get("limit") ?? 100);
  const requestedOffset = Number(searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500)
    : 100;
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(Math.trunc(requestedOffset), 0)
    : 0;

  const entities = listKitchenEntities();
  const paginatedEntities = entities.slice(offset, offset + limit);

  return NextResponse.json({
    entities: paginatedEntities,
    pagination: {
      limit,
      offset,
      total: entities.length,
      hasMore: offset + paginatedEntities.length < entities.length,
    },
  });
}
