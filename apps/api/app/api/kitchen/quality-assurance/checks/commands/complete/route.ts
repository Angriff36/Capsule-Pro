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
    const { checkId, status, completedBy, notes, itemResults, correctiveActionsNeeded } = body;

    if (!checkId || !status) {
      return NextResponse.json(
        { error: 'Check ID and status are required' },
        { status: 400 }
      );
    }

    // Update the check
    const check = await database.qualityCheck.update({
      where: {
        tenantId_id: { tenantId, id: checkId },
      },
      data: {
        status,
        completedAt: new Date(),
        completedBy: completedBy || userId,
        notes,
      },
      include: {
        items: true,
      },
    });

    // Update individual item results if provided
    if (itemResults?.length) {
      for (const itemResult of itemResults) {
        await database.qualityCheckItem.update({
          where: {
            tenantId_id: { tenantId, id: itemResult.itemId },
          },
          data: {
            passed: itemResult.passed,
            value: itemResult.value,
            notes: itemResult.notes,
          },
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      check,
      correctiveActionsNeeded: correctiveActionsNeeded || false,
    });
  } catch (error) {
    console.error('Error completing quality check:', error);
    return NextResponse.json(
      { error: 'Failed to complete quality check' },
      { status: 500 }
    );
  }
}
