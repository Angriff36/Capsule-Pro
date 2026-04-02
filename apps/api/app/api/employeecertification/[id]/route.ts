// Auto-generated Next.js API route for employeecertification (detail)
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

  const employeecertification = await database.employee_certifications.findFirst({
    where: { id }
  });

  if (!employeecertification) {
    return manifestErrorResponse("employeecertification not found", 404);
  }

    return manifestSuccessResponse({ employeecertification });
  } catch (error) {
    console.error("Error fetching employeecertification:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
