// Knowledge Base Entry Delete Command
// Delete a knowledge base entry

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

// POST /api/knowledge-base/entries/commands/delete
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = (await request.json()) as { id: string };
    const { id } = body;

    if (!id) {
      return manifestErrorResponse("Entry ID is required", 400);
    }

    // Check entry exists
    const existing = await database.knowledgeBaseEntry.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      return manifestErrorResponse("Entry not found", 404);
    }

    await database.knowledgeBaseEntry.delete({
      where: { id },
    });

    return manifestSuccessResponse({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge base entry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
