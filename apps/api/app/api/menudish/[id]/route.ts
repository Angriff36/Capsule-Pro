// Auto-generated Next.js API route for menudish (detail)
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

  const menudish = await database.menuDish.findFirst({
    where: { id }
  });

  if (!menudish) {
    return manifestErrorResponse("menudish not found", 404);
  }

    return manifestSuccessResponse({ menudish });
  } catch (error) {
    console.error("Error fetching menudish:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
