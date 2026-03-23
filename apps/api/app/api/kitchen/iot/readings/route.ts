import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { auth } from '@repo/auth/server';

/**
 * GET /api/kitchen/iot/readings
 * Get recent temperature readings from probes
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const probeId = searchParams.get('probeId');
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);

    const where: Record<string, unknown> = {};
    if (probeId) {
      where.probeId = probeId;
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await database.temperatureReading.findMany({
      where: {
        ...where,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ readings });
  } catch (error) {
    console.error('List readings error:', error);
    return NextResponse.json(
      { error: 'Failed to list readings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/iot/readings
 * Record a new temperature reading from a probe
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { probeId, temperature, humidity, batteryLevel } = body;

    if (!probeId || temperature === undefined) {
      return NextResponse.json(
        { error: 'Probe ID and temperature are required' },
        { status: 400 }
      );
    }

    // Create the reading
    const reading = await database.temperatureReading.create({
      data: {
        probeId,
        temperature,
        humidity,
        recordedAt: new Date(),
      },
    });

    // Update probe status
    await database.temperatureProbe.update({
      where: { id: probeId },
      data: {
        lastReading: temperature,
        lastReadingAt: new Date(),
        batteryLevel: batteryLevel !== undefined ? batteryLevel : undefined,
      },
    });

    // Check for alerts
    const probe = await database.temperatureProbe.findUnique({
      where: { id: probeId },
    });

    if (probe && (temperature < probe.minTemp || temperature > probe.maxTemp)) {
      // Create alert if out of range
      await database.iotAlert.create({
        data: {
          probeId,
          alertType: temperature < probe.minTemp ? 'low_temp' : 'high_temp',
          severity: 'warning',
          message: `Temperature ${temperature}°C is outside safe range (${probe.minTemp}°C - ${probe.maxTemp}°C)`,
          temperature,
          status: 'active',
          triggeredAt: new Date(),
        },
      });
    }

    return NextResponse.json({ reading });
  } catch (error) {
    console.error('Create reading error:', error);
    return NextResponse.json(
      { error: 'Failed to record reading' },
      { status: 500 }
    );
  }
}
