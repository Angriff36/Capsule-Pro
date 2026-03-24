import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getTenantIdForOrg } from '@/app/lib/tenant';
import { database } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const severity = searchParams.get('severity'); // critical, high, medium, low
    const status = searchParams.get('status'); // open, in_progress, resolved, verified

    const where: Record<string, unknown> = { tenantId };
    if (eventId) where.eventId = eventId;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const actions = await database.correctiveAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, actions });
  } catch (error) {
    console.error('Error listing corrective actions:', error);
    return NextResponse.json(
      { error: 'Failed to list corrective actions' },
      { status: 500 }
    );
  }
}
