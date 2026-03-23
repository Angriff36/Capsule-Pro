import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/auth';
import { database } from '@repo/database';

/**
 * POST /api/events/automated-followups/commands/generate
 * Auto-generate follow-up tasks for an event based on event type and timeline
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }

    // Get event details
    const events = await database.$queryRaw<Array<{
      id: string;
      eventName: string;
      eventDate: Date;
      eventType: string | null;
    }>>`
      SELECT id, event_name, event_date, event_type
      FROM tenant_events.events
      WHERE id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    const event = events[0];
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if follow-ups already exist
    const existing = await database.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) FROM tenant_events.event_followups
      WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (Number(existing[0]?.count || 0) > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Follow-ups already exist for this event',
        generated: 0 
      });
    }

    const eventDate = new Date(event.eventDate);
    const now = new Date();
    const followups: Array<{
      taskType: string;
      description: string;
      dueDate: Date;
    }> = [];

    // Standard event follow-up timeline
    // 1. Post-event thank you (1 day after)
    const thankYou = new Date(eventDate);
    thankYou.setDate(thankYou.getDate() + 1);
    followups.push({
      taskType: 'communication',
      description: 'Send thank you email to client',
      dueDate: thankYou
    });

    // 2. Feedback request (3 days after)
    const feedback = new Date(eventDate);
    feedback.setDate(feedback.getDate() + 3);
    followups.push({
      taskType: 'feedback',
      description: 'Request client feedback/review',
      dueDate: feedback
    });

    // 3. Invoice follow-up (7 days after if not paid)
    const invoice = new Date(eventDate);
    invoice.setDate(invoice.getDate() + 7);
    followups.push({
      taskType: 'billing',
      description: 'Verify invoice payment status',
      dueDate: invoice
    });

    // 4. Final cleanup (14 days after)
    const cleanup = new Date(eventDate);
    cleanup.setDate(cleanup.getDate() + 14);
    followups.push({
      taskType: 'administrative',
      description: 'Archive event documents and close event',
      dueDate: cleanup
    });

    // 5. Re-engagement (30 days after)
    const reengage = new Date(eventDate);
    reengage.setDate(reengage.getDate() + 30);
    followups.push({
      taskType: 'sales',
      description: 'Send re-engagement email for future bookings',
      dueDate: reengage
    });

    // Insert all follow-ups
    let generated = 0;
    for (const followup of followups) {
      const id = crypto.randomUUID();
      try {
        await database.$executeRaw`
          INSERT INTO tenant_events.event_followups (
            id, tenant_id, event_id, task_type, description,
            due_date, status, created_at, updated_at
          ) VALUES (
            ${id}::uuid, ${tenantId}::uuid, ${eventId}::uuid, ${followup.taskType}, ${followup.description},
            ${followup.dueDate}::timestamptz, 'pending', NOW(), NOW()
          )
        `;
        generated++;
      } catch (e) {
        console.error(`Failed to create followup ${followup.taskType}:`, e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      generated,
      message: `Generated ${generated} follow-up tasks for event` 
    });
  } catch (error) {
    console.error('Error generating followups:', error);
    return NextResponse.json(
      { error: 'Failed to generate followups' },
      { status: 500 }
    );
  }
}
