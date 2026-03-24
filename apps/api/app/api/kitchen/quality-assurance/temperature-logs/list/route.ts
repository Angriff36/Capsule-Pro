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
    const equipmentId = searchParams.get('equipmentId');
    const logType = searchParams.get('logType'); // cooler, freezer, hot_hold, cooking, receiving
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { tenantId };
    if (eventId) where.eventId = eventId;
    if (equipmentId) where.equipmentId = equipmentId;
    if (logType) where.logType = logType;
    if (startDate || endDate) {
      where.loggedAt = {};
      if (startDate) (where.loggedAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.loggedAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const logs = await database.temperatureLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error listing temperature logs:', error);
    return NextResponse.json(
      { error: 'Failed to list temperature logs' },
      { status: 500 }
    );
  }
}
