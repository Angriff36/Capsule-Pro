// Auto-generated Next.js API route for BattleBoard
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@repo/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
  // Auth disabled - all requests allowed
  const userId = "anonymous";


const battleBoards = await database.battleBoard.findMany({
    where: {
        deletedAt: null
      },
    orderBy: {
      createdAt: "desc",
    },
  });

    return manifestSuccessResponse({ battleBoards });
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
    console.error("Error fetching battleBoards:", error);
    return manifestErrorResponse(
      { error: "Internal server error", diagnostics: [{ kind: "runtime_error", message: error instanceof Error ? error.message : String(error) }] },
      500,
    );
  }
}
