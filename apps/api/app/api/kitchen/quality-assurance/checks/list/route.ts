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
    const status = searchParams.get('status'); // pending, passed, failed, needs_review
    const checkType = searchParams.get('checkType'); // receiving, storage, prep, cooking, cooling, holding, transport

    const where: Record<string, unknown> = { tenantId };
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    if (checkType) where.checkType = checkType;

    const checks = await database.qualityCheck.findMany({
      where,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, checks });
  } catch (error) {
    console.error('Error listing quality checks:', error);
    return NextResponse.json(
      { error: 'Failed to list quality checks' },
      { status: 500 }
    );
  }
}
