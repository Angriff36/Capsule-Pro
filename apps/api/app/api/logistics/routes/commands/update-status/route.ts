import { NextRequest, NextResponse } from 'next/server';
import { database } from '@repo/database';
import { getTenantId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routeId, status, stopId, stopStatus } = body;

    if (!routeId) {
      return NextResponse.json({ error: 'Route ID required' }, { status: 400 });
    }

    // Update route status
    if (status) {
      const validStatuses = [
        'draft',
        'optimized',
        'in_progress',
        'completed',
        'cancelled',
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      const updateData: any = { status };

      if (status === 'in_progress') {
        updateData.actualStartTime = new Date();
      } else if (status === 'completed') {
        updateData.actualEndTime = new Date();
      }

      const route = await database.deliveryRoute.update({
        where: { tenantId, id: routeId },
        data: updateData,
      });

      return NextResponse.json({ route });
    }

    // Update stop status
    if (stopId && stopStatus) {
      const validStopStatuses = [
        'pending',
        'in_transit',
        'arrived',
        'completed',
        'skipped',
      ];
      if (!validStopStatuses.includes(stopStatus)) {
        return NextResponse.json(
          { error: 'Invalid stop status' },
          { status: 400 }
        );
      }

      const updateData: any = { status: stopStatus };

      if (stopStatus === 'arrived') {
        updateData.actualArrival = new Date();
      } else if (stopStatus === 'completed' || stopStatus === 'skipped') {
        updateData.actualDeparture = new Date();
      }

      const stop = await database.routeStop.update({
        where: { id: stopId },
        data: updateData,
      });

      return NextResponse.json({ stop });
    }

    return NextResponse.json(
      { error: 'No update specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
