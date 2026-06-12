/**
 * @module EventWaitlistAPI
 * @intent List waitlisted guests with RSVP status and capacity summary
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(
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

  // Fetch event with capacity info using Prisma
  const event = await database.event.findUnique({
    where: { id: eventId, tenantId },
    select: { maxCapacity: true },
  });
  const maxCapacity = event?.maxCapacity ?? null;

  // Fetch all guests using Prisma
  const dbGuests = await database.eventGuest.findMany({
    where: { eventId, tenantId, deletedAt: null },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      rsvpStatus: true,
      waitlistPosition: true,
      rsvpRespondedAt: true,
      createdAt: true,
    },
    orderBy: [{ waitlistPosition: "asc" }, { createdAt: "desc" }],
  });

  // Convert to legacy field names for compatibility
  const guests = dbGuests.map((g) => ({
    id: g.id,
    guest_name: g.guestName,
    guest_email: g.guestEmail,
    guest_phone: g.guestPhone,
    rsvp_status: g.rsvpStatus,
    waitlist_position: g.waitlistPosition,
    rsvp_responded_at: g.rsvpRespondedAt?.toISOString() ?? null,
    created_at: g.createdAt.toISOString(),
  }));

  // Compute summary
  const confirmed = guests.filter((g) => g.rsvp_status === "confirmed").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;
  const tentative = guests.filter((g) => g.rsvp_status === "tentative").length;
  const waitlisted = guests.filter(
    (g) => g.rsvp_status === "waitlisted"
  ).length;
  const total = guests.length;
  const spotsRemaining =
    maxCapacity === null ? null : Math.max(0, maxCapacity - confirmed);

  return NextResponse.json({
    data: {
      guests,
      summary: {
        total,
        confirmed,
        pending,
        declined,
        tentative,
        waitlisted,
        capacity: maxCapacity,
        spotsRemaining,
      },
    },
  });
}
