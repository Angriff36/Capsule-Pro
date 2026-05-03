/**
 * @module DeleteEventTimelineItem
 * @intent Soft-delete a timeline item by setting deletedAt
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

interface DeletePayload {
  itemId?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  if (!UUID_REGEX.test(eventId)) {
    return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
  }

  const tenantId = await getTenantIdForOrg(orgId ?? "");
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  let body: DeletePayload;
  try {
    body = (await request.json()) as DeletePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!UUID_REGEX.test(itemId)) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  const existing = await database.eventTimeline.findFirst({
    where: { tenantId, id: itemId, eventId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Timeline item not found" },
      { status: 404 }
    );
  }

  await database.eventTimeline.update({
    where: { tenantId_id: { tenantId, id: itemId } },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ data: { id: itemId, deleted: true } });
}
