import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('eventId');
  const status = searchParams.get('status'); // pending, passed, failed, needs_review
  const checkType = searchParams.get('checkType'); // receiving, storage, prep, cooking, cooling, holding, transport

  const runtime = await createManifestRuntime('kitchen/quality-assurance/checks/list');
  
  const result = await runtime.execute({
    eventType,
    status,
    checkType,
    includeItems: true,
  });

  return NextResponse.json(result);
}
