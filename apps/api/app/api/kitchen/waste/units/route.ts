import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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

    // Get all units for waste tracking dropdown
    const units = await database.$queryRaw<
      Array<{
        id: number;
        code: string;
        name: string;
        name_plural: string;
        unit_system: string;
        unit_type: string;
      }>
    >`
      SELECT id, code, name, name_plural, unit_system, unit_type
      FROM core.units
      ORDER BY unit_type, code
    `;

    return NextResponse.json({ data: units });
  } catch (error) {
    console.error("Failed to fetch units:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
