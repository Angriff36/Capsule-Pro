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
    const { eventId, checkType, title, description, scheduledAt, assignedTo, checklistItems } = body;

    if (!checkType || !title) {
      return NextResponse.json(
        { error: 'Check type and title are required' },
        { status: 400 }
      );
    }

    // Generate check number
    const checkCount = await database.qualityCheck.count({ where: { tenantId } });
    const checkNumber = `QC-${String(checkCount + 1).padStart(6, '0')}`;

    const check = await database.qualityCheck.create({
      data: {
        tenantId,
        checkNumber,
        eventId,
        checkType,
        title,
        description,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        assignedTo,
        status: 'pending',
        items: checklistItems?.length ? {
          create: checklistItems.map((item: { name: string; criterion: string }, index: number) => ({
            tenantId,
            itemName: item.name,
            criterion: item.criterion,
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, check });
  } catch (error) {
    console.error('Error creating quality check:', error);
    return NextResponse.json(
      { error: 'Failed to create quality check' },
      { status: 500 }
    );
  }
}
