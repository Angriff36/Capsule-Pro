/**
 * App-owned outbox adapter seam for Manifest command side effects.
 */
export interface OutboxEvent {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export async function writeOutboxEvents(_events: OutboxEvent[]): Promise<void> {
  throw new Error(
    "writeOutboxEvents is not implemented yet. Add transactional outbox persistence here."
  );
}
