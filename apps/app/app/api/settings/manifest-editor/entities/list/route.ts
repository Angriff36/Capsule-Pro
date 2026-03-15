import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { listKitchenEntities } from "@/app/lib/manifest-editor/kitchen-ir";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return new Response("Unauthorized", { status: 401 });
  }

  return NextResponse.json({ entities: listKitchenEntities() });
}

