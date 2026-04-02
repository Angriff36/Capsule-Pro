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
  const { guestName, guestEmail, guestPhone, dietaryRestrictions, allergenRestrictions, specialMealRequired, specialMealNotes } = body;

  if (!guestName?.trim()) {
    return NextResponse.json({ error: "guestName is required" }, { status: 400 });
  }

  // Get event capacity
  const event = await database.$queryRawUnsafe<Array<{ max_capacity: number | null }>>(
    `SELECT max_capacity FROM tenant_events.events WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    eventId, tenantId
  );

  if (!event.length) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const maxCapacity = event[0].max_capacity;

  // Count confirmed guests
  const countResult = await database.$queryRawUnsafe<Array<{ cnt: bigint }>>(
    `SELECT COUNT(*)::bigint as cnt FROM tenant_events.event_guests WHERE event_id = $1 AND tenant_id = $2 AND rsvp_status = 'confirmed' AND deleted_at IS NULL`,
    eventId, tenantId
  );
  const confirmedCount = Number(countResult[0].cnt);

  // Determine RSVP status
  let rsvpStatus = "confirmed";
  let waitlistPosition: number | null = null;

  if (maxCapacity !== null && confirmedCount >= maxCapacity) {
    rsvpStatus = "waitlisted";
    const posResult = await database.$queryRawUnsafe<Array<{ max_pos: number | null }>>(
      `SELECT COALESCE(MAX(waitlist_position), 0) as max_pos FROM tenant_events.event_guests WHERE event_id = $1 AND tenant_id = $2 AND waitlist_position IS NOT NULL AND deleted_at IS NULL`,
      eventId, tenantId
    );
    waitlistPosition = (posResult[0].max_pos ?? 0) + 1;
  }

  // Insert guest
  const result = await database.$queryRawUnsafe<Array<{
    id: string; guest_name: string; guest_email: string | null; guest_phone: string | null;
    rsvp_status: string; waitlist_position: number | null; created_at: string;
  }>>(
    `INSERT INTO tenant_events.event_guests (tenant_id, event_id, guest_name, guest_email, guest_phone, dietary_restrictions, allergen_restrictions, special_meal_required, special_meal_notes, rsvp_status, waitlist_position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, guest_name, guest_email, guest_phone, rsvp_status, waitlist_position, created_at`,
    tenantId, eventId, guestName.trim(), guestEmail ?? null, guestPhone ?? null,
    dietaryRestrictions ?? [], allergenRestrictions ?? [],
    specialMealRequired ?? false, specialMealNotes ?? null,
    rsvpStatus, waitlistPosition
  );

  return NextResponse.json({ data: result[0] });
}
