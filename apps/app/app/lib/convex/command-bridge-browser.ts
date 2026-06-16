"use client";

import { getConvexBrowserClient } from "./browser-client";
import { buildMutationArgs, mutationRef } from "./command-bridge";
import { getConvexTenantCache } from "./tenant-cache";

export async function runConvexCommandBrowser<T = unknown>(
  entity: string,
  command: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const tenantId = getConvexTenantCache();
  if (!tenantId) {
    throw new Error("Tenant context not ready — reload the page");
  }
  const client = getConvexBrowserClient();
  const ref = mutationRef(entity, command);
  const args = buildMutationArgs(command, body, tenantId);
  return client.mutation(ref, args) as Promise<T>;
}
