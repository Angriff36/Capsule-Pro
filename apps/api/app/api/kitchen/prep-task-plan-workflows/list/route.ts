// Auto-generated Next.js API route for PrepTaskPlanWorkflow
// Generated from Manifest IR - DO NOT EDIT
//
// NOTE: This route is disabled because the prepTaskPlanWorkflow model
// does not exist in the current Prisma schema. Enable this route
// after adding the model to the schema and running prisma generate.

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { manifestErrorResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    // Model not available - return empty array for now
    return Response.json({ prepTaskPlanWorkflows: [] });
  } catch (error) {
    console.error("Error fetching prepTaskPlanWorkflows:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
