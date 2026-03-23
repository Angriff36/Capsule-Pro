// Knowledge Base Entries List API Route
// Provides listing of knowledge base entries with filtering

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export interface KnowledgeBaseEntry {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  status: "draft" | "published" | "archived";
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

interface KnowledgeBaseListResponse {
  entries: KnowledgeBaseEntry[];
  hasMore: boolean;
  totalCount: number;
}

// GET /api/knowledge-base/entries - List entries with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    // Pagination
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
    };

    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (tag) {
      where.tags = { has: tag };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await database.knowledgeBaseEntry.count({ where });

    // Fetch entries with pagination
    const entries = await database.knowledgeBaseEntry.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const hasMore = offset + entries.length < totalCount;

    return manifestSuccessResponse<KnowledgeBaseListResponse>({
      entries: entries as KnowledgeBaseEntry[],
      hasMore,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching knowledge base entries:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
