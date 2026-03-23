import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/auth';
import { database } from '@repo/database';

/**
 * POST /api/events/automated-followups/commands/skip
 * Skip a follow-up task with a reason
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { followupId, reason } = body;

    if (!followupId) {
      return NextResponse.json(
        { error: 'followupId is required' },
        { status: 400 }
      );
    }

    const result = await database.$executeRaw`
      UPDATE tenant_events.event_followups
      SET status = 'skipped',
          notes = ${reason || 'Skipped'},
          updated_at = NOW()
      WHERE id = ${followupId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (result === 0) {
      return NextResponse.json({ error: 'Followup not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error skipping followup:', error);
    return NextResponse.json(
      { error: 'Failed to skip followup' },
      { status: 500 }
    );
  }
}
