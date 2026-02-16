import type { PrismaClient } from "@repo/database";
import { createPrismaOutboxWriter } from "@repo/manifest-adapters/prisma-store";

export interface ManifestOutboxEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
}

export async function writeManifestOutboxEvents(
  tx: PrismaClient,
  tenantId: string,
  aggregateType: string,
  events: ManifestOutboxEvent[]
): Promise<void> {
  const writer = createPrismaOutboxWriter(aggregateType, tenantId);
  await writer(tx, events);
}
