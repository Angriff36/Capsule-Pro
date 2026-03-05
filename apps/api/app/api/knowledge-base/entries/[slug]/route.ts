// Knowledge Base Entry by Slug API
// Fetches a single knowledge base entry by its slug

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const entry = await database.knowledgeEntry.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: params.slug,
        },
        deletedAt: null,
      },
      select: {
        tenantId: true,
        id: true,
        title: true,
        slug: true,
        content: true,
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
        versions: {
          take: 10,
          orderBy: { versionNumber: "desc" },
          select: {
            id: true,
            versionNumber: true,
            title: true,
            category: true,
            changeReason: true,
            changeType: true,
            createdBy: true,
            createdAt: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            displayName: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    if (!entry) {
      return manifestErrorResponse("Knowledge entry not found", 404);
    }

    // Increment view count asynchronously
    database.knowledgeEntry
      .update({
        where: { tenantId_slug: { tenantId, slug: params.slug } },
        data: { viewCount: { increment: 1 } },
      })
      .catch(console.error);

    return manifestSuccessResponse({ entry });
  } catch (error) {
    console.error("Error fetching knowledge entry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
