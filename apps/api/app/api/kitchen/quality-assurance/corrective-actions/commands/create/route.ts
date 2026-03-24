import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getTenantIdForOrg } from '@/app/lib/tenant';
import { database } from '@/lib/database';

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
    const { 
      eventId, 
      relatedCheckId, 
      relatedTempLogId, 
      severity, 
      title, 
      description, 
      rootCause, 
      immediateAction, 
      preventiveAction, 
      assignedTo, 
      dueDate 
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generate action number
    const actionCount = await database.correctiveAction.count({ where: { tenantId } });
    const actionNumber = `CA-${String(actionCount + 1).padStart(6, '0')}`;

    const action = await database.correctiveAction.create({
      data: {
        tenantId,
        actionNumber,
        eventId,
        relatedCheckId,
        relatedTempLogId,
        severity: severity || 'medium',
        title,
        description,
        rootCause,
        immediateAction,
        preventiveAction,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'open',
      },
    });

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error creating corrective action:', error);
    return NextResponse.json(
      { error: 'Failed to create corrective action' },
      { status: 500 }
    );
  }
}
