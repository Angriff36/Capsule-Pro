/**
 * @module UpdateGuestRSVP
 * @intent Update RSVP status with auto-promotion from waitlist
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const VALID_STATUSES = ["confirmed", "declined", "pending", "tentative", "waitlisted"];

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

  if (!guestId || !status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "guestId and valid status required" }, { status: 400 });
  }

  // Get current guest
  const current = await database.$queryRawUnsafe<Array<{ rsvp_status: string; waitlist_position: number | null }>>(
    `SELECT rsvp_status, waitlist_position FROM tenant_events.event_guests WHERE id = $1 AND tenant_id = $2 AND event_id = $3 AND deleted_at IS NULL`,
    guestId, tenantId, eventId
  );

  if (!current.length) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const now = status === "pending" ? null : new Date().toISOString();
  let autoPromoted: { id: string; guest_name: string } | null = null;

  // Update RSVP status
  const updated = await database.$queryRawUnsafe<Array<{ id: string; guest_name: string; rsvp_status: string; waitlist_position: number | null }>>(
    `UPDATE tenant_events.event_guests
     SET rsvp_status = $1, waitlist_position = CASE WHEN $1 = 'confirmed' THEN NULL ELSE waitlist_position END, rsvp_responded_at = $4, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND event_id = $5 AND deleted_at IS NULL
     RETURNING id, guest_name, rsvp_status, waitlist_position`,
    status, guestId, tenantId, now, eventId
  );

  // Auto-promote: if declining/leaving and there's a waitlist
  if (status === "declined" && current[0].rsvp_status === "confirmed") {
    const nextOnWaitlist = await database.$queryRawUnsafe<Array<{ id: string; guest_name: string; waitlist_position: number }>>(
      `SELECT id, guest_name, waitlist_position FROM tenant_events.event_guests
       WHERE event_id = $1 AND tenant_id = $2 AND rsvp_status = 'waitlisted' AND deleted_at IS NULL
       ORDER BY waitlist_position ASC LIMIT 1`,
      eventId, tenantId
    );

    if (nextOnWaitlist.length > 0) {
      const promoted = nextOnWaitlist[0];
      await database.$queryRawUnsafe(
        `UPDATE tenant_events.event_guests SET rsvp_status = 'confirmed', waitlist_position = NULL, rsvp_responded_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        promoted.id, tenantId
      );

      // Shift remaining waitlist positions down
      await database.$queryRawUnsafe(
        `UPDATE tenant_events.event_guests SET waitlist_position = waitlist_position - 1, updated_at = NOW()
         WHERE event_id = $1 AND tenant_id = $2 AND rsvp_status = 'waitlisted' AND waitlist_position > $3 AND deleted_at IS NULL`,
        eventId, tenantId, promoted.waitlist_position
      );

      autoPromoted = { id: promoted.id, guest_name: promoted.guest_name };
    }
  }

  return NextResponse.json({ data: updated[0], autoPromoted });
}
