import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdForOrg } from '@/app/lib/tenant';
import { database } from '@/lib/database';
import { auth } from '@repo/auth/server';

/**
 * GET /api/kitchen/iot/alerts
 * List active IoT alerts
 */
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
    const probeId = searchParams.get('probeId');
    const status = searchParams.get('status') || 'active';

    const where: Record<string, unknown> = { tenantId, status };
    if (probeId) {
      where.probeId = probeId;
    }

    const alerts = await database.ioTAlert.findMany({
      where,
      include: {
        probe: true,
      },
      orderBy: { triggeredAt: 'desc' },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('List IoT alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to list alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/iot/alerts
 * Create/trigger an IoT alert
 */
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
    const { probeId, alertType, severity, message, temperature } = body;

    if (!probeId || !alertType || !message) {
      return NextResponse.json(
        { error: 'Probe ID, alert type, and message are required' },
        { status: 400 }
      );
    }

    // Generate alert number
    const alertCount = await database.ioTAlert.count({ where: { tenantId } });
    const alertNumber = `ALT-${String(alertCount + 1).padStart(6, '0')}`;

    const alert = await database.ioTAlert.create({
      data: {
        tenantId,
        alertNumber,
        probeId,
        alertType,
        severity: severity || 'warning',
        title: alertType,
        message,
        temperature,
        status: 'active',
        triggeredAt: new Date(),
      },
    });

    // TODO: Send notification to relevant staff

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Create IoT alert error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
