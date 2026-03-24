import { NextRequest, NextResponse } from 'next/server';
import { database } from '@repo/database';
import { requireTenantId } from '@/app/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    if (date) {
      const dateObj = new Date(date);
      where.scheduledDate = dateObj;
    }

    const routes = await database.deliveryRoute.findMany({
      where,
      include: {
        stops: {
          orderBy: { stopNumber: 'asc' },
        },
      },
      orderBy: { scheduledDate: 'desc' },
      take: limit,
    });

    return NextResponse.json({ routes });
  } catch (error) {
    console.error('Error listing routes:', error);
    return NextResponse.json(
      { error: 'Failed to list routes' },
      { status: 500 }
    );
  }
}
