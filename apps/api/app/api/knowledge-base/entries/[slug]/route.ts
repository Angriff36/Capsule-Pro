// Knowledge Base Entry by Slug API Route
// Get a single knowledge base entry by slug

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

// GET /api/knowledge-base/entries/[slug] - Get entry by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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

    const { slug } = await params;

    const entry = await database.knowledgeBaseEntry.findFirst({
      where: {
        tenantId,
        slug,
      },
    });

    if (!entry) {
      return manifestErrorResponse("Entry not found", 404);
    }

    return manifestSuccessResponse({ entry });
  } catch (error) {
    console.error("Error fetching knowledge base entry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
