import { type NextRequest, NextResponse } from "next/server";
import { savePrepListToDatabase } from "../../../../(authenticated)/kitchen/prep-lists/actions";

/**
 * POST /api/kitchen/prep-lists/save-db
 * Save a generated prep list to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, prepList, name } = body;

    if (!eventId || !prepList) {
      return NextResponse.json(
        { error: "eventId and prepList are required" },
        { status: 400 }
      );
    }

    const result = await savePrepListToDatabase(eventId, prepList, name);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save prep list" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Prep list saved successfully",
      prepListId: result.prepListId,
    });
  } catch (error) {
    console.error("Error saving prep list to database:", error);
    return NextResponse.json(
      { error: "Failed to save prep list to database" },
      { status: 500 }
    );
  }
}
