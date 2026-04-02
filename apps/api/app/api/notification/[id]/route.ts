// Auto-generated Next.js API route for notification (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const notification = await database.notification.findUnique({
    where: { id }
  });

  if (!notification) {
    return manifestErrorResponse("notification not found", 404);
  }

    return manifestSuccessResponse({ notification });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
