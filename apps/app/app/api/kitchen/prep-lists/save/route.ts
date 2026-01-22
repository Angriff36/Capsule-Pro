import { type NextRequest, NextResponse } from "next/server";
import { savePrepListToProductionBoard } from "../../../../(authenticated)/kitchen/prep-lists/actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, prepList } = body;

    if (!(eventId && prepList)) {
      return NextResponse.json(
        { error: "Event ID and prep list are required" },
        { status: 400 }
      );
    }

    const result = await savePrepListToProductionBoard(eventId, prepList);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save prep list" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error saving prep list:", error);
    return NextResponse.json(
      { error: "Failed to save prep list" },
      { status: 500 }
    );
  }
}
