"use server";

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { fetchAllEventDetailsData } from "./event-details-data";

/**
 * Server action that re-fetches all event details data.
 * Used as the queryFn for TanStack Query's useQuery when client-side mutations
 * invalidate the query cache. This replaces full page refreshes after mutations.
 */
export async function refreshEventDetailsData(eventId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  return fetchAllEventDetailsData(tenantId, eventId);
}
