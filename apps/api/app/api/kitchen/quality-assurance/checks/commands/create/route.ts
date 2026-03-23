import { NextRequest, NextResponse } from 'next/server';
import { createManifestRuntime } from '@repo/manifest-adapters/manifest-runtime-factory';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const runtime = await createManifestRuntime('kitchen/quality-assurance/checks/commands/create');
  
  const result = await runtime.execute({
    eventId: body.eventId,
    checkType: body.checkType, // receiving, storage, prep, cooking, cooling, holding, transport
    title: body.title,
    description: body.description,
    scheduledAt: body.scheduledAt,
    assignedTo: body.assignedTo,
    checklistItems: body.checklistItems || [],
  });

  return NextResponse.json(result);
}
