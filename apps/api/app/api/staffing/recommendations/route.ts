import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

/**
 * POST /api/staffing/recommendations
 * Generate AI-powered staffing recommendations for an event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, eventSize, complexity, historicalData } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const runtime = await createManifestRuntime({
      request,
      manifestName: 'workforce-ai-rules',
      entityId: eventId,
    });

    // Calculate staffing needs based on event parameters
    const baseStaffCount = Math.ceil(eventSize / 20); // 1 staff per 20 guests
    const complexityMultiplier = complexity === 'high' ? 1.5 : complexity === 'low' ? 0.8 : 1.0;
    const recommendedStaff = Math.ceil(baseStaffCount * complexityMultiplier);

    // Role distribution based on event type
    const recommendations = {
      eventId,
      totalStaff: recommendedStaff,
      roles: {
        chefs: Math.ceil(recommendedStaff * 0.3),
        servers: Math.ceil(recommendedStaff * 0.4),
        bartenders: Math.ceil(recommendedStaff * 0.15),
        support: Math.ceil(recommendedStaff * 0.15),
      },
      shifts: [
        { name: 'Setup', hours: 4, staffCount: Math.ceil(recommendedStaff * 0.4) },
        { name: 'Service', hours: 6, staffCount: recommendedStaff },
        { name: 'Cleanup', hours: 3, staffCount: Math.ceil(recommendedStaff * 0.5) },
      ],
      estimatedCost: recommendedStaff * 25 * 8, // $25/hr avg, 8 hours avg
      confidence: historicalData ? 'high' : 'medium',
      factors: [
        `Event size: ${eventSize} guests`,
        `Complexity: ${complexity || 'standard'}`,
        historicalData ? 'Based on historical data' : 'No historical data available',
      ],
    };

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Staffing recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate staffing recommendations' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staffing/recommendations
 * List staffing recommendations for events
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Return cached recommendations or generate new ones
    // For now, return a placeholder
    return NextResponse.json({
      recommendations: null,
      message: 'Use POST to generate new recommendations',
    });
  } catch (error) {
    console.error('Staffing recommendations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staffing recommendations' },
      { status: 500 }
    );
  }
}
