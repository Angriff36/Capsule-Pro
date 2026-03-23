import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { auth } from '@repo/auth/server';

/**
 * GET /api/kitchen/iot/probes
 * List all IoT temperature probes
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const where: Record<string, unknown> = {};
    if (locationId) {
      where.locationId = locationId;
    }

    const probes = await database.temperatureProbe.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ probes });
  } catch (error) {
    console.error('List probes error:', error);
    return NextResponse.json(
      { error: 'Failed to list probes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/iot/probes
 * Register a new IoT temperature probe
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, probeId, locationId, probeType, minTemp, maxTemp } = body;

    if (!name || !probeId) {
      return NextResponse.json(
        { error: 'Name and probe ID are required' },
        { status: 400 }
      );
    }

    const probe = await database.temperatureProbe.create({
      data: {
        name,
        probeId,
        locationId: locationId || null,
        probeType: probeType || 'bluetooth',
        minTemp: minTemp || -40,
        maxTemp: maxTemp || 300,
        status: 'active',
        lastReading: null,
        batteryLevel: 100,
        lastCalibration: null,
        nextCalibration: null,
      },
    });

    return NextResponse.json({ probe });
  } catch (error) {
    console.error('Create probe error:', error);
    return NextResponse.json(
      { error: 'Failed to create probe' },
      { status: 500 }
    );
  }
}
