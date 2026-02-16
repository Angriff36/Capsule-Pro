import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";

/**
 * GET /api/kitchen/waste/reasons
 * Get all active waste reasons for dropdown
 */
export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get all active waste reasons
    const reasons = await database.wasteReason.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        colorHex: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ data: reasons });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
