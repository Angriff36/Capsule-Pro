import "server-only";

import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  runConvexGet,
  runConvexTenantList,
} from "./command-bridge-server";
import type { ConvexDoc } from "./doc-utils";

export type { ConvexDoc } from "./doc-utils";
export {
  activeTenantRows,
  convexDocId,
  msToDate,
  parseDecimalString,
} from "./doc-utils";

export async function serverListEntity(entity: string): Promise<ConvexDoc[]> {
  const rows = await runConvexTenantList(entity);
  return rows as ConvexDoc[];
}

export async function serverGetEntity(
  entity: string,
  id: string
): Promise<ConvexDoc | null> {
  const row = await runConvexGet(entity, id);
  return (row as ConvexDoc | null) ?? null;
}

export function asConvexId<T extends string>(id: string): Id<T> {
  return id as Id<T>;
}
