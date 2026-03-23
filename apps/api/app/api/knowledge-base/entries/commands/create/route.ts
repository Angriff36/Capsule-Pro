// Knowledge Base Entry Create Command
// Create a new knowledge base entry

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface CreateEntryRequest {
  slug: string;
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  status?: "draft" | "published" | "archived";
}

// POST /api/knowledge-base/entries/commands/create
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

    const body = (await request.json()) as CreateEntryRequest;
    const { slug, title, content, category, tags, status = "draft" } = body;

    if (!slug || !title) {
      return manifestErrorResponse("Slug and title are required", 400);
    }

    // Check for duplicate slug
    const existing = await database.knowledgeBaseEntry.findFirst({
      where: {
        tenantId,
        slug,
      },
    });

    if (existing) {
      return manifestErrorResponse(
        "Entry with this slug already exists",
        409
      );
    }

    const entry = await database.knowledgeBaseEntry.create({
      data: {
        tenantId,
        slug,
        title,
        content,
        category,
        tags,
        status,
        authorId: userId,
        publishedAt: status === "published" ? new Date() : null,
      },
    });

    return manifestSuccessResponse({ entry }, 201);
  } catch (error) {
    console.error("Error creating knowledge base entry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
