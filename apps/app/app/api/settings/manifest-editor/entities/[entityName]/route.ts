import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getKitchenEntityDetail } from "@/app/lib/manifest-editor/kitchen-ir";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ entityName: string }> }
): Promise<Response> {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { entityName } = await context.params;
  const entity = getKitchenEntityDetail(entityName);
  if (!entity) {
    return new Response("Not found", { status: 404 });
  }

  return NextResponse.json({ entity });
}

