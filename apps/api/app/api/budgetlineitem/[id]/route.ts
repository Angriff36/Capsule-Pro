// Auto-generated Next.js API route for budgetlineitem (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const budgetlineitem = await database.budgetlineitem.findUnique({
    where: { id }
  });

  if (!budgetlineitem) {
    return manifestErrorResponse("budgetlineitem not found", 404);
  }

    return manifestSuccessResponse({ budgetlineitem });
  } catch (error) {
    console.error("Error fetching budgetlineitem:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
