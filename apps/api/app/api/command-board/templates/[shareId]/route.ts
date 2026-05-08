/**
 * API endpoint for getting a public template by shareId
 *
 * NOTE: CommandBoard model is missing shareId/isPublic fields (projections, groups,
 * annotations relations already exist). This endpoint returns 501 Not Implemented
 * until the model is updated.
 */

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { manifestErrorResponse } from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return manifestErrorResponse("Share ID is required", 400);
    }

    // NOTE: CommandBoard already has projections, groups, annotations relations.
    // Only shareId and isPublic fields are missing from the schema.
    // BLOCKER: Needs schema migration to add shareId/isPublic to CommandBoard.
    // Tracked as capsule-pro/TODO:commandboard-share-fields

    return manifestErrorResponse(
      "Template sharing not yet implemented - needs shareId/isPublic fields on CommandBoard",
      501
    );
  } catch (error) {
    captureException(error);
    log.error("Error fetching shared template:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const { shareId } = await params;

    if (!shareId) {
      return manifestErrorResponse("Share ID is required", 400);
    }

    // NOTE: CommandBoard already has projections, groups, annotations relations.
    // Only shareId and isPublic fields are missing from the schema.
    // BLOCKER: Needs schema migration to add shareId/isPublic to CommandBoard.
    // Tracked as capsule-pro/TODO:commandboard-share-fields

    return manifestErrorResponse(
      "Template sharing not yet implemented - needs shareId/isPublic fields on CommandBoard",
      501
    );
  } catch (error) {
    captureException(error);
    log.error("Error creating board from shared template:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
