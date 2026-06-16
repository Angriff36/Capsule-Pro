import "server-only";

import { requireTenantId } from "@/app/lib/tenant";
import {
  buildMutationArgs,
  getQueryName,
  mutationRef,
  queryRef,
  tenantListQueryName,
} from "./command-bridge";
import { getConvexServerClient } from "./server-client";

export async function runConvexMutation(
  entity: string,
  command: string,
  body: Record<string, unknown> = {}
): Promise<unknown> {
  const tenantId = await requireTenantId();
  const client = await getConvexServerClient();
  const ref = mutationRef(entity, command);
  const args = buildMutationArgs(command, body, tenantId);
  return client.mutation(ref, args);
}

export async function runConvexTenantList(entity: string): Promise<unknown[]> {
  const tenantId = await requireTenantId();
  const client = await getConvexServerClient();
  const ref = queryRef(tenantListQueryName(entity));
  return (await client.query(ref, { tenantId })) as unknown[];
}

export async function runConvexGet(
  entity: string,
  id: string
): Promise<unknown | null> {
  const client = await getConvexServerClient();
  const ref = queryRef(getQueryName(entity));
  return client.query(ref, { id });
}
