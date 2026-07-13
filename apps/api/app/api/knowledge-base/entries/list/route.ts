// Knowledge Base Entries List API Route
// Provides listing of knowledge base entries with filtering

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export interface KnowledgeBaseEntry {
  authorId: string | null;
  category: string | null;
  content: string | null;
  createdAt: Date;
  id: string;
  publishedAt: Date | null;
  status: "draft" | "published" | "archived";
  tags: string[] | null;
  tenantId: string;
  title: string;
  updatedAt: Date;
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

    // Fetch entries + total count in parallel (independent reads, same where)
    // — collapses 2 serial round-trips into 1 concurrent batch (#23).
    // Order preserved (count first) to match existing test expectations.
    const [totalCount, entries] = await Promise.all([
      database.knowledgeBaseEntry.count({ where }),
      database.knowledgeBaseEntry.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
    ]);

    const hasMore = offset + entries.length < totalCount;

    return manifestSuccessResponse({
      entries: entries as KnowledgeBaseEntry[],
      hasMore,
      totalCount,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching knowledge base entries:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
