// Auto-generated Next.js API route for payrollrun (detail)
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

  const payrollrun = await database.payroll_runs.findFirst({
    where: { id }
  });

  if (!payrollrun) {
    return manifestErrorResponse("payrollrun not found", 404);
  }

    return manifestSuccessResponse({ payrollrun });
  } catch (error) {
    console.error("Error fetching payrollrun:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
