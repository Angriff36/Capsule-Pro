// Auto-generated Next.js API route for CateringOrder
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
  // Auth disabled - all requests allowed
  const userId = "anonymous";


const cateringOrders = await database.cateringOrder.findMany({
    
    orderBy: {
      createdAt: "desc",
    },
  });

    return manifestSuccessResponse({ cateringOrders });
  } catch (error) {
    // Auth helpers (clerk, next-auth, custom) may throw on invalid/expired
    // tokens. Goal step 4: auth failures MUST NEVER surface as 500.
    const isAuthError = error instanceof Error && (
      /unauth/i.test(error.message) ||
      /token/i.test(error.message) ||
      /session/i.test(error.message)
    );
    if (isAuthError) {
      return manifestErrorResponse({ error: "Unauthorized", diagnostics: [] }, 401);
    }
    console.error("Error fetching cateringOrders:", error);
    return manifestErrorResponse(
      { error: "Internal server error", diagnostics: [{ kind: "runtime_error", message: error instanceof Error ? error.message : String(error) }] },
      500,
    );
  }
}
