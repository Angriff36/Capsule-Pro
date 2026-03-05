// Knowledge Base Create Command Handler
// Creates a new knowledge base entry through the Manifest runtime

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

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

    const body = await request.json();

    const runtime = await createManifestRuntime({
      user: { id: userId, tenantId },
    });

    const result = await runtime.runCommand(
      "create",
      {
        authorId: userId,
        title: body.title,
        slug: body.slug,
        content: body.content ?? "",
        excerpt: body.excerpt ?? "",
        category: body.category ?? "general",
        tags: body.tags ?? [],
        difficultyLevel: body.difficultyLevel ?? null,
        relatedRecipeId: body.relatedRecipeId ?? null,
        relatedEquipment: body.relatedEquipment ?? null,
        relatedEventId: body.relatedEventId ?? null,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        searchKeywords: body.searchKeywords ?? [],
      },
      {
        entityName: "KnowledgeEntry",
      }
    );

    if (!result.success) {
      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName}`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("Error executing KnowledgeEntry.create:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
