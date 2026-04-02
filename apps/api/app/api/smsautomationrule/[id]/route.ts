// Auto-generated Next.js API route for smsautomationrule (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const smsautomationrule = await database.smsautomationrule.findUnique({
    where: { id }
  });

  if (!smsautomationrule) {
    return manifestErrorResponse("smsautomationrule not found", 404);
  }

    return manifestSuccessResponse({ smsautomationrule });
  } catch (error) {
    console.error("Error fetching smsautomationrule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
