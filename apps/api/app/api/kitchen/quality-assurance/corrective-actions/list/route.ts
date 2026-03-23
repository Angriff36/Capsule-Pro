import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('eventId');
  const severity = searchParams.get('severity'); // critical, high, medium, low
  const status = searchParams.get('status'); // open, in_progress, resolved, verified

  const runtime = await createManifestRuntime('kitchen/quality-assurance/corrective-actions/list');
  
  const result = await runtime.execute({
    eventType,
    severity,
    status,
    includeActions: true,
  });

  return NextResponse.json(result);
}
