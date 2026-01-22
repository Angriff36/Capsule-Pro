import { type NextRequest, NextResponse } from "next/server";
import { generatePrepList } from "../../../../(authenticated)/kitchen/prep-lists/actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, batchMultiplier, dietaryRestrictions } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const prepList = await generatePrepList({
      eventId,
      batchMultiplier,
      dietaryRestrictions,
    });

    return NextResponse.json(prepList);
  } catch (error) {
    console.error("Error generating prep list:", error);
    return NextResponse.json(
      { error: "Failed to generate prep list" },
      { status: 500 }
    );
  }
}
