import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getTenantIdForOrg } from '@/app/lib/tenant';
import { database } from '@repo/database';

/**
 * POST /api/events/automated-followups/commands/create
 * Create a new automated follow-up task for an event
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const body = await request.json();
    const { eventId, taskType, description, dueDate, assignedTo } = body;

    if (!eventId || !taskType || !description) {
      return NextResponse.json(
        { error: 'eventId, taskType, and description are required' },
        { status: 400 }
      );
    }

    const id = createId();

    await database.$executeRaw`
      INSERT INTO tenant_events.event_followups (
        id, tenant_id, event_id, task_type, description, 
        due_date, status, assigned_to, created_at, updated_at
      ) VALUES (
        ${id}::uuid, ${tenantId}::uuid, ${eventId}::uuid, ${taskType}, ${description},
        ${dueDate ? new Date(dueDate) : null}::timestamptz, 'pending',
        ${assignedTo || null}::uuid, NOW(), NOW()
      )
    `;

    return NextResponse.json({ 
      success: true, 
      followup: { 
        id, 
        tenantId, 
        eventId, 
        taskType, 
        description, 
        dueDate, 
        status: 'pending',
        assignedTo 
      } 
    });
  } catch (error) {
    console.error('Error creating automated followup:', error);
    return NextResponse.json(
      { error: 'Failed to create followup' },
      { status: 500 }
    );
  }
}
