/**
 * @module PromoteWaitlistGuest
 * @intent Manually promote a waitlisted guest to confirmed
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const tenantId = await getTenantIdForOrg(orgId ?? "");
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const body = await request.json();
  const { guestId } = body;

  if (!guestId) {
    return NextResponse.json({ error: "guestId required" }, { status: 400 });
  }

  // Get current position for shift
  const current = await database.eventGuest.findFirst({
    where: {
      tenantId,
      id: guestId,
      eventId,
      rsvpStatus: "waitlisted",
      deletedAt: null,
    },
    select: { waitlistPosition: true },
  });

  if (!current) {
    return NextResponse.json(
      { error: "Guest not found or not on waitlist" },
      { status: 404 }
    );
  }

  // Promote
  const promoted = await database.eventGuest.update({
    where: { tenantId_id: { tenantId, id: guestId } },
    data: {
      rsvpStatus: "confirmed",
      waitlistPosition: null,
      rsvpRespondedAt: new Date(),
    },
    select: { id: true, guestName: true, rsvpStatus: true },
  });

  // Shift remaining positions down
  await database.eventGuest.updateMany({
    where: {
      eventId,
      tenantId,
      rsvpStatus: "waitlisted",
      waitlistPosition: { gt: current.waitlistPosition! },
      deletedAt: null,
    },
    data: {
      waitlistPosition: { decrement: 1 },
    },
  });

  return NextResponse.json({
    data: {
      id: promoted.id,
      guest_name: promoted.guestName,
      rsvp_status: promoted.rsvpStatus,
    },
  });
}
