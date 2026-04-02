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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const tenantId = await getTenantIdForOrg(session.user.orgId);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const body = await request.json();
  const { guestId } = body;

  if (!guestId) {
    return NextResponse.json({ error: "guestId required" }, { status: 400 });
  }

  // Get current position for shift
  const current = await database.$queryRawUnsafe<Array<{ waitlist_position: number }>>(
    `SELECT waitlist_position FROM tenant_events.event_guests WHERE id = $1 AND tenant_id = $2 AND event_id = $3 AND rsvp_status = 'waitlisted' AND deleted_at IS NULL`,
    guestId, tenantId, eventId
  );

  if (!current.length) {
    return NextResponse.json({ error: "Guest not found or not on waitlist" }, { status: 404 });
  }

  // Promote
  const promoted = await database.$queryRawUnsafe<Array<{ id: string; guest_name: string; rsvp_status: string }>>(
    `UPDATE tenant_events.event_guests SET rsvp_status = 'confirmed', waitlist_position = NULL, rsvp_responded_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND event_id = $3
     RETURNING id, guest_name, rsvp_status`,
    guestId, tenantId, eventId
  );

  // Shift remaining positions down
  await database.$queryRawUnsafe(
    `UPDATE tenant_events.event_guests SET waitlist_position = waitlist_position - 1, updated_at = NOW()
     WHERE event_id = $1 AND tenant_id = $2 AND rsvp_status = 'waitlisted' AND waitlist_position > $3 AND deleted_at IS NULL`,
    eventId, tenantId, current[0].waitlist_position
  );

  return NextResponse.json({ data: promoted[0] });
}
