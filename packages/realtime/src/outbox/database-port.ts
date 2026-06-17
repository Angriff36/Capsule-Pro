/** Minimal outbox write port (formerly Prisma TransactionClient). */

export type OutboxEventCreateInput = {
  data: {
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: string;
    tenantId: string;
  };
};

export type OutboxDatabase = {
  outboxEvent: {
    create: (input: OutboxEventCreateInput) => Promise<unknown>;
  };
};
