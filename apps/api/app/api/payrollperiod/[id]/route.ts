// Auto-generated Next.js API route for payrollperiod (detail)
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

  const payrollperiod = await database.payroll_periods.findFirst({
    where: { id }
  });

  if (!payrollperiod) {
    return manifestErrorResponse("payrollperiod not found", 404);
  }

    return manifestSuccessResponse({ payrollperiod });
  } catch (error) {
    console.error("Error fetching payrollperiod:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
