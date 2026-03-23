import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const runtime = await createManifestRuntime('kitchen/quality-assurance/temperature-logs/commands/log');
  
  const result = await runtime.execute({
    eventId: body.eventId,
    equipmentId: body.equipmentId,
    logType: body.logType, // cooler, freezer, hot_hold, cooking, receiving, cooling
    temperature: body.temperature,
    unit: body.unit || 'F',
    loggedAt: body.loggedAt || new Date().toISOString(),
    loggedBy: body.loggedBy,
    itemName: body.itemName,
    targetTemp: body.targetTemp,
    withinRange: body.withinRange,
    notes: body.notes,
    correctiveActionTaken: body.correctiveActionTaken,
  });

  return NextResponse.json(result);
}
