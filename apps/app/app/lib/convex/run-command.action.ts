"use server";

import { requireTenantId } from "@/app/lib/tenant";
import { buildMutationArgs, mutationRef } from "./command-bridge";
import { getConvexServerClient } from "./server-client";

export async function runConvexCommandAction<T = unknown>(params: {
  entity: string;
  command: string;
  body: Record<string, unknown>;
}): Promise<{ success: true; result: T; events: unknown[] }> {
  const { entity, command, body } = params;
  const tenantId = await requireTenantId();
  const client = await getConvexServerClient();
  const ref = mutationRef(entity, command);
  const args = buildMutationArgs(command, body, tenantId);
  const result = (await client.mutation(ref, args)) as T;
  return { success: true, result, events: [] };
}
