import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const runtime = await createManifestRuntime('kitchen/quality-assurance/checks/commands/complete');
  
  const result = await runtime.execute({
    checkId: body.checkId,
    status: body.status, // passed, failed, needs_review
    completedBy: body.completedBy,
    completedAt: new Date().toISOString(),
    notes: body.notes,
    itemResults: body.itemResults || [], // [{ itemId, passed, value, notes }]
    correctiveActionsNeeded: body.correctiveActionsNeeded || false,
  });

  return NextResponse.json(result);
}
