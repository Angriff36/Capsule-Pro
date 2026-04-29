/**
 * @module AddGuestToWaitlist
 * @intent Add a guest to an event, auto-waitlisting if at capacity
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
  const {
    guestName,
    guestEmail,
    guestPhone,
    dietaryRestrictions,
    allergenRestrictions,
    specialMealRequired,
    specialMealNotes,
  } = body;

  if (!guestName?.trim()) {
    return NextResponse.json(
      { error: "guestName is required" },
      { status: 400 }
    );
  }

  // Get event capacity
  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
      deletedAt: null,
    },
    select: { maxCapacity: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const maxCapacity = event.maxCapacity;

  // Count confirmed guests
  const confirmedCount = await database.eventGuest.count({
    where: {
      eventId,
      tenantId,
      rsvpStatus: "confirmed",
      deletedAt: null,
    },
  });

  // Determine RSVP status
  let rsvpStatus = "confirmed";
  let waitlistPosition: number | null = null;

  if (maxCapacity !== null && confirmedCount >= maxCapacity) {
    rsvpStatus = "waitlisted";
    const maxPos = await database.eventGuest.aggregate({
      where: {
        eventId,
        tenantId,
        waitlistPosition: { not: null },
        deletedAt: null,
      },
      _max: { waitlistPosition: true },
    });
    waitlistPosition = (maxPos._max.waitlistPosition ?? 0) + 1;
  }

  // Insert guest
  const guest = await database.eventGuest.create({
    data: {
      tenantId,
      eventId,
      guestName: guestName.trim(),
      guestEmail: guestEmail ?? null,
      guestPhone: guestPhone ?? null,
      dietaryRestrictions: dietaryRestrictions ?? [],
      allergenRestrictions: allergenRestrictions ?? [],
      specialMealRequired: specialMealRequired ?? false,
      specialMealNotes: specialMealNotes ?? null,
      rsvpStatus,
      waitlistPosition,
    },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      rsvpStatus: true,
      waitlistPosition: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: {
      id: guest.id,
      guest_name: guest.guestName,
      guest_email: guest.guestEmail,
      guest_phone: guest.guestPhone,
      rsvp_status: guest.rsvpStatus,
      waitlist_position: guest.waitlistPosition,
      created_at: guest.createdAt,
    },
  });
}
