import { NextResponse } from "next/server";
import { updateEventBudgetsForRecipe } from "@/app/lib/recipe-costing";

export async function POST(
  request: Request,
  _params: { params: Promise<{ recipeVersionId: string }> }
) {
  try {
    const body = await request.json();
    const { recipeVersionId } = body;

    if (!recipeVersionId) {
      return NextResponse.json(
        { error: "recipeVersionId is required" },
        { status: 400 }
      );
    }

    await updateEventBudgetsForRecipe(recipeVersionId);

    return NextResponse.json({
      success: true,
      message: "Event budgets updated",
    });
  } catch (error) {
    console.error("Error updating event budgets:", error);
    return NextResponse.json(
      { error: "Failed to update event budgets" },
      { status: 500 }
    );
  }
}
