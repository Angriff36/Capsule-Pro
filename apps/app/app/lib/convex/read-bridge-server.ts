import "server-only";

import { runConvexGet, runConvexTenantList } from "./command-bridge-server";

export async function fetchConvexList(entity: string): Promise<unknown[]> {
  return runConvexTenantList(entity);
}

export async function fetchConvexRecord(
  entity: string,
  id: string
): Promise<unknown | null> {
  return runConvexGet(entity, id);
}
