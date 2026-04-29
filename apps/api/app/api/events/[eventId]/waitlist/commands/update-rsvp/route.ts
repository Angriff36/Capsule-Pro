/**
 * @module UpdateGuestRSVP
 * @intent Update RSVP status with auto-promotion from waitlist
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const VALID_STATUSES = [
  "confirmed",
  "declined",
  "pending",
  "tentative",
  "waitlisted",
];

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
  const { guestId, status } = body;

  if (!(guestId && status && VALID_STATUSES.includes(status))) {
    return NextResponse.json(
      { error: "guestId and valid status required" },
      { status: 400 }
    );
  }

  // Get current guest
  const current = await database.eventGuest.findFirst({
    where: {
      tenantId,
      id: guestId,
      eventId,
      deletedAt: null,
    },
    select: { rsvpStatus: true, waitlistPosition: true },
  });

  if (!current) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const now = status === "pending" ? null : new Date();
  let autoPromoted: { id: string; guest_name: string } | null = null;

  // Update RSVP status — clear waitlist position when confirming
  const updated = await database.eventGuest.update({
    where: { tenantId_id: { tenantId, id: guestId } },
    data: {
      rsvpStatus: status,
      waitlistPosition:
        status === "confirmed" ? null : current.waitlistPosition,
      rsvpRespondedAt: now,
    },
    select: {
      id: true,
      guestName: true,
      rsvpStatus: true,
      waitlistPosition: true,
    },
  });

  // Auto-promote: if declining/leaving and there's a waitlist
  if (status === "declined" && current.rsvpStatus === "confirmed") {
    const nextOnWaitlist = await database.eventGuest.findFirst({
      where: {
        eventId,
        tenantId,
        rsvpStatus: "waitlisted",
        deletedAt: null,
      },
      orderBy: { waitlistPosition: "asc" },
      select: { id: true, guestName: true, waitlistPosition: true },
    });

    if (nextOnWaitlist) {
      await database.eventGuest.update({
        where: {
          tenantId_id: {
            tenantId,
            id: nextOnWaitlist.id,
          },
        },
        data: {
          rsvpStatus: "confirmed",
          waitlistPosition: null,
          rsvpRespondedAt: new Date(),
        },
      });

      // Shift remaining waitlist positions down
      await database.eventGuest.updateMany({
        where: {
          eventId,
          tenantId,
          rsvpStatus: "waitlisted",
          waitlistPosition: { gt: nextOnWaitlist.waitlistPosition! },
          deletedAt: null,
        },
        data: {
          waitlistPosition: { decrement: 1 },
        },
      });

      autoPromoted = {
        id: nextOnWaitlist.id,
        guest_name: nextOnWaitlist.guestName,
      };
    }
  }

  return NextResponse.json({
    data: {
      id: updated.id,
      guest_name: updated.guestName,
      rsvp_status: updated.rsvpStatus,
      waitlist_position: updated.waitlistPosition,
    },
    autoPromoted,
  });
}
