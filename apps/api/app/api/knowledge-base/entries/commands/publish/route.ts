// Knowledge Base Entry Publish Command
// Publish or unpublish a knowledge base entry

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

// POST /api/knowledge-base/entries/commands/publish
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

    const body = (await request.json()) as { 
      id: string; 
      status?: "draft" | "published" | "archived" 
    };
    const { id, status = "published" } = body;

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

    const entry = await database.knowledgeBaseEntry.update({
      where: { id },
      data: {
        status,
        publishedAt: status === "published" ? new Date() : existing.publishedAt,
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ entry });
  } catch (error) {
    console.error("Error publishing knowledge base entry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
