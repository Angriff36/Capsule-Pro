import type { FunctionReference } from "convex/server";
import { api } from "../../../../../convex/_generated/api";

type MutationRef = FunctionReference<"mutation", "public", Record<string, unknown>, unknown>;

const mutations = api.mutations as Record<string, MutationRef>;
const queries = api.queries as Record<string, FunctionReference<"query">>;

export function mutationRef(entity: string, command: string): MutationRef {
  const key = `${entity}_${command}`;
  const ref = mutations[key];
  if (!ref) {
    throw new Error(`Unknown Convex mutation: ${key}`);
  }
  return ref;
}

export function queryRef(name: string) {
  const ref = queries[name];
  if (!ref) {
    throw new Error(`Unknown Convex query: ${name}`);
  }
  return ref;
}

/** Map Manifest command body → Convex mutation args (docId, tenantId). */
export function buildMutationArgs(
  command: string,
  body: Record<string, unknown>,
  tenantId: string
): Record<string, unknown> {
  const args = { ...body };
  if (command === "create") {
    args.tenantId = tenantId;
  }
  if (command !== "create" && args.id != null && args.docId == null) {
    args.docId = args.id;
    delete args.id;
  }
  return args;
}

export function tenantListQueryName(entity: string): string {
  return `list${entity}ByTenantId`;
}

export function getQueryName(entity: string): string {
  return `get${entity}`;
}
