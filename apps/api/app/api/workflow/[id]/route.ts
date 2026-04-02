// Auto-generated Next.js API route for workflow (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const workflow = await database.workflow.findUnique({
    where: { id }
  });

  if (!workflow) {
    return manifestErrorResponse("workflow not found", 404);
  }

    return manifestSuccessResponse({ workflow });
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
