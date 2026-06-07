import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";

/**
 * GET /api/kitchen/waste/units
 * Get all available measurement units for waste tracking
 */
export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const units = await database.units.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        name_plural: true,
        unit_system: true,
        unit_type: true,
      },
      orderBy: [{ unit_type: "asc" }, { code: "asc" }],
    });

    return NextResponse.json({ data: units });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
