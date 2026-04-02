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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const tenantId = await getTenantIdForOrg(session.user.orgId);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  // Fetch event with capacity info
  const event = await database.$queryRawUnsafe<Array<{ max_capacity: number | null }>>(
    `SELECT max_capacity FROM tenant_events.events WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    eventId, tenantId
  );
  const maxCapacity = event[0]?.max_capacity ?? null;

  // Fetch all guests
  const guests = await database.$queryRawUnsafe<Array<{
    id: string;
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    rsvp_status: string;
    waitlist_position: number | null;
    rsvp_responded_at: string | null;
    created_at: string;
  }>>(
    `SELECT id, guest_name, guest_email, guest_phone, rsvp_status, waitlist_position, rsvp_responded_at, created_at
     FROM tenant_events.event_guests
     WHERE event_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     ORDER BY
       CASE WHEN waitlist_position IS NOT NULL THEN 1 ELSE 0 END,
       waitlist_position ASC NULLS LAST,
       created_at DESC`,
    eventId, tenantId
  );

  // Compute summary
  const confirmed = guests.filter(g => g.rsvp_status === "confirmed").length;
  const pending = guests.filter(g => g.rsvp_status === "pending").length;
  const declined = guests.filter(g => g.rsvp_status === "declined").length;
  const tentative = guests.filter(g => g.rsvp_status === "tentative").length;
  const waitlisted = guests.filter(g => g.rsvp_status === "waitlisted").length;
  const total = guests.length;
  const spotsRemaining = maxCapacity !== null ? Math.max(0, maxCapacity - confirmed) : null;

  return NextResponse.json({
    data: {
      guests,
      summary: { total, confirmed, pending, declined, tentative, waitlisted, capacity: maxCapacity, spotsRemaining }
    }
  });
}
