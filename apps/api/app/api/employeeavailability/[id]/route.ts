// Auto-generated Next.js API route for employeeavailability (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const employeeavailability = await database.employee_availability.findFirst({
    where: { id }
  });

  if (!employeeavailability) {
    return manifestErrorResponse("employeeavailability not found", 404);
  }

    return manifestSuccessResponse({ employeeavailability });
  } catch (error) {
    console.error("Error fetching employeeavailability:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
