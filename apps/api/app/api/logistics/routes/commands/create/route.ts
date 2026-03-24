import { NextRequest, NextResponse } from 'next/server';
import { database } from '@repo/database';
import { requireTenantId } from '@/app/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body = await request.json();
    const { name, description, eventId, scheduledDate, stops } = body;

    // Generate route number
    const lastRoute = await database.deliveryRoute.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { routeNumber: true },
    });

    const nextNumber = lastRoute
      ? parseInt(lastRoute.routeNumber.replace('RT-', '')) + 1
      : 1;
    const routeNumber = `RT-${nextNumber.toString().padStart(6, '0')}`;

    const route = await database.deliveryRoute.create({
      data: {
        tenantId,
        routeNumber,
        name: name || `Route ${routeNumber}`,
        description,
        eventId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        stops: stops
          ? {
              create: stops.map((stop: any, index: number) => ({
                tenantId,
                stopNumber: index + 1,
                locationId: stop.locationId,
                venueId: stop.venueId,
                name: stop.name,
                addressLine1: stop.addressLine1,
                addressLine2: stop.addressLine2,
                city: stop.city,
                stateProvince: stop.stateProvince,
                postalCode: stop.postalCode,
                countryCode: stop.countryCode,
                latitude: stop.latitude,
                longitude: stop.longitude,
                stopType: stop.stopType || 'delivery',
                plannedArrival: stop.plannedArrival
                  ? new Date(stop.plannedArrival)
                  : null,
                plannedDuration: stop.plannedDuration,
                notes: stop.notes,
              })),
            }
          : undefined,
      },
      include: {
        stops: { orderBy: { stopNumber: 'asc' } },
      },
    });

    return NextResponse.json({ route });
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json(
      { error: 'Failed to create route' },
      { status: 500 }
    );
  }
}
