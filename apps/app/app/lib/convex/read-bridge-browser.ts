"use client";

import { getConvexBrowserClient } from "./browser-client";
import { getQueryName, queryRef, tenantListQueryName } from "./command-bridge";
import { getConvexTenantCache } from "./tenant-cache";

export async function fetchConvexListBrowser(entity: string): Promise<unknown[]> {
  const tenantId = getConvexTenantCache();
  if (!tenantId) {
    throw new Error("Tenant context not ready");
  }
  const client = getConvexBrowserClient();
  const ref = queryRef(tenantListQueryName(entity));
  return (await client.query(ref, { tenantId })) as unknown[];
}

export async function fetchConvexRecordBrowser(
  entity: string,
  id: string
): Promise<unknown | null> {
  const client = getConvexBrowserClient();
  const ref = queryRef(getQueryName(entity));
  return client.query(ref, { id });
}
