import { NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/app/lib/tenant';
import { database, Prisma } from '@repo/database';

/**
 * GET /api/events/automated-followups/list
 * List automated follow-up tasks for events
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = { tenantId };
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;

    const followups = await database.$queryRaw`
      SELECT 
        ef.id,
        ef.tenant_id,
        ef.event_id,
        ef.task_type,
        ef.description,
        ef.due_date,
        ef.status,
        ef.assigned_to,
        ef.completed_at,
        ef.created_at,
        e.event_name,
        e.event_date
      FROM tenant_events.event_followups ef
      LEFT JOIN tenant_events.events e ON e.tenant_id = ef.tenant_id AND e.id = ef.event_id
      WHERE ef.tenant_id = ${tenantId}::uuid
      ${eventId ? Prisma.sql`AND ef.event_id = ${eventId}::uuid` : Prisma.empty}
      ${status ? Prisma.sql`AND ef.status = ${status}` : Prisma.empty}
      ORDER BY ef.due_date ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({ followups });
  } catch (error) {
    console.error('Error listing automated followups:', error);
    return NextResponse.json(
      { error: 'Failed to list followups' },
      { status: 500 }
    );
  }
}
