import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getTenantIdForOrg } from '@/app/lib/tenant';
import { database } from '@repo/database';

/**
 * POST /api/events/automated-followups/commands/complete
 * Mark a follow-up task as completed
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
    const { followupId, notes } = body;

    if (!followupId) {
      return NextResponse.json(
        { error: 'followupId is required' },
        { status: 400 }
      );
    }

    const result = await database.$executeRaw`
      UPDATE tenant_events.event_followups
      SET status = 'completed', 
          completed_at = NOW(),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
      WHERE id = ${followupId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (result === 0) {
      return NextResponse.json({ error: 'Followup not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing followup:', error);
    return NextResponse.json(
      { error: 'Failed to complete followup' },
      { status: 500 }
    );
  }
}
