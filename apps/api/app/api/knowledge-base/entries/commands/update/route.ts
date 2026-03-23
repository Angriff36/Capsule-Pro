// Knowledge Base Entry Update Command
// Update an existing knowledge base entry

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface UpdateEntryRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  slug?: string;
}

// POST /api/knowledge-base/entries/commands/update
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

    const body = (await request.json()) as UpdateEntryRequest & { id: string };
    const { id, title, content, category, tags, slug } = body;

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

    // If slug is being changed, check for duplicates
    if (slug && slug !== existing.slug) {
      const duplicate = await database.knowledgeBaseEntry.findFirst({
        where: {
          tenantId,
          slug,
          NOT: { id },
        },
      });

      if (duplicate) {
        return manifestErrorResponse(
          "Entry with this slug already exists",
          409
        );
      }
    }

    const entry = await database.knowledgeBaseEntry.update({
      where: { id },
      data: {
        title,
        content,
        category,
        tags,
        slug,
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ entry });
  } catch (error) {
    console.error("Error updating knowledge base entry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
