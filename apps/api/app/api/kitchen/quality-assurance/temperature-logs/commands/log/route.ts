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
      equipmentId, 
      logType, 
      temperature, 
      unit, 
      loggedAt, 
      loggedBy, 
      itemName, 
      targetTemp, 
      withinRange, 
      notes, 
      correctiveActionTaken 
    } = body;

    if (!logType || temperature === undefined) {
      return NextResponse.json(
        { error: 'Log type and temperature are required' },
        { status: 400 }
      );
    }

    // Generate log number
    const logCount = await database.temperatureLog.count({ where: { tenantId } });
    const logNumber = `TL-${String(logCount + 1).padStart(6, '0')}`;

    const log = await database.temperatureLog.create({
      data: {
        tenantId,
        logNumber,
        eventId,
        equipmentId,
        logType,
        itemName,
        temperature,
        unit: unit || 'F',
        targetTemp,
        withinRange,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        loggedBy: loggedBy || userId,
        notes,
        correctiveAction: correctiveActionTaken,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Error creating temperature log:', error);
    return NextResponse.json(
      { error: 'Failed to create temperature log' },
      { status: 500 }
    );
  }
}
