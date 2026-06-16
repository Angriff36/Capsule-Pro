/**
 * Temporary shim after packages/database removal.
 * Runtime calls throw — migrate callers to manifest-client / read-bridge-server.
 */

const REMOVED =
  "Prisma removed from Convex clone — use manifest-client.generated or read-bridge-server";

function removed(): never {
  throw new Error(REMOVED);
}

function removedProxy(): unknown {
  return new Proxy(removed, {
    apply: removed,
    get: () => removedProxy(),
  });
}

export const database = removedProxy() as Record<string, unknown>;

export namespace Prisma {
  export type Sql = { strings: string[]; values: unknown[] };
  export class Decimal {
    constructor(_value?: unknown) {
      throw new Error(REMOVED);
    }
  }
  export const sql = removedProxy;
  export const join = removedProxy;
  export const empty = removedProxy;
  export type JsonValue = unknown;
  export type InputJsonValue = unknown;
}

export type PrismaClient = typeof database;

export type AllergenWarning = Record<string, unknown>;
export type Client = Record<string, unknown>;
export type ClientContact = Record<string, unknown>;
export type ClientInteraction = Record<string, unknown>;
export type ContractSignature = Record<string, unknown>;
export type EmailTemplate = Record<string, unknown>;
export type Event = Record<string, unknown>;
export type EventContract = Record<string, unknown>;
export type EventGuest = Record<string, unknown>;
export type KitchenTask = Record<string, unknown>;
export type KitchenTaskClaim = Record<string, unknown>;
export type OutboundWebhook = Record<string, unknown>;
export type PrepTask = Record<string, unknown>;
export type Proposal = Record<string, unknown>;
export type ProposalTemplate = Record<string, unknown>;
export type User = Record<string, unknown>;
export type Venue = Record<string, unknown>;
export type WasteEntry = Record<string, unknown>;
export type WebhookDeliveryLog = Record<string, unknown>;
export type email_template_type = string;
export type email_trigger_type = string;
