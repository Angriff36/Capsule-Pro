// Knowledge Base Entries List API
// Lists knowledge base entries with search and filter capabilities

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export const runtime = "nodejs";

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
    const category = searchParams.get("category");
    const status = searchParams.get("status") ?? "published";
    const search = searchParams.get("search");
    const tags = searchParams.get("tags")?.split(",");
    const featured = searchParams.get("featured");
    const limit = Number.parseInt(searchParams.get("limit") ?? "50");
    const offset = Number.parseInt(searchParams.get("offset") ?? "0");

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
        { searchKeywords: { has: search } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    const [entries, total] = await Promise.all([
      database.knowledgeEntry.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: Math.min(limit, 200),
        skip: offset,
        select: {
          tenantId: true,
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          tags: true,
          difficultyLevel: true,
          status: true,
          versionNumber: true,
          isFeatured: true,
          metaTitle: true,
          metaDescription: true,
          viewCount: true,
          helpfulCount: true,
          notHelpfulCount: true,
          authorId: true,
          reviewedBy: true,
          approvedBy: true,
          reviewedAt: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          relatedRecipeId: true,
          relatedEquipment: true,
          relatedEventId: true,
        },
      }),
      database.knowledgeEntry.count({ where }),
    ]);

    return manifestSuccessResponse({
      entries,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching knowledge entries:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
