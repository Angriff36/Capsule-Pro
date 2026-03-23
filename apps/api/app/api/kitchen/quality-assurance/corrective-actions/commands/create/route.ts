import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const runtime = await createManifestRuntime('kitchen/quality-assurance/corrective-actions/commands/create');
  
  const result = await runtime.execute({
    eventId: body.eventId,
    relatedCheckId: body.relatedCheckId,
    relatedTempLogId: body.relatedTempLogId,
    severity: body.severity, // critical, high, medium, low
    title: body.title,
    description: body.description,
    rootCause: body.rootCause,
    immediateAction: body.immediateAction,
    preventiveAction: body.preventiveAction,
    assignedTo: body.assignedTo,
    dueDate: body.dueDate,
  });

  return NextResponse.json(result);
}
