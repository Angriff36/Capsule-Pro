// DEPRECATED ALIAS — forwards to canonical dispatcher at
// /api/manifest/BulkOrderRule/commands/update.
// Kept for backward compatibility with existing clients posting to
// /api/inventory/bulk-order-rules/commands/update. New clients should call
// POST /api/manifest/BulkOrderRule/commands/update directly. The dispatcher
// reads `id` (or `bulkOrderRuleId`) from the request body to resolve the
// instance, preserving the prior contract.

import type { NextRequest } from "next/server";
import { POST as dispatcherPost } from "@/app/api/manifest/[entity]/commands/[command]/route";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  return dispatcherPost(request, {
    params: Promise.resolve({ entity: "BulkOrderRule", command: "update" }),
  });
}
