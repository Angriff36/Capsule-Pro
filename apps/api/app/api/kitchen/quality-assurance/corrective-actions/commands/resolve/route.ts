import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const runtime = await createManifestRuntime('kitchen/quality-assurance/corrective-actions/commands/resolve');
  
  const result = await runtime.execute({
    actionId: body.actionId,
    status: body.status, // resolved, verified
    resolvedBy: body.resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolutionNotes: body.resolutionNotes,
    verificationMethod: body.verificationMethod,
    verifiedBy: body.verifiedBy,
  });

  return NextResponse.json(result);
}
