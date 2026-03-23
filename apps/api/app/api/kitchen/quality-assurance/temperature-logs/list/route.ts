import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  const equipmentId = searchParams.get('equipmentId');
  const logType = searchParams.get('logType'); // cooler, freezer, hot_hold, cooking, receiving
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const runtime = await createManifestRuntime('kitchen/quality-assurance/temperature-logs/list');
  
  const result = await runtime.execute({
    eventId,
    equipmentId,
    logType,
    startDate,
    endDate,
  });

  return NextResponse.json(result);
}
