import { NextResponse } from "next/server";
import {
  type PortionScaleRequest,
  scaleRecipeCost,
  updateRecipeIngredientWasteFactor,
} from "@/app/lib/recipe-costing";

export async function POST(
  request: Request,
  _params: { params: Promise<{ recipeVersionId: string }> }
) {
  try {
    const body = (await request.json()) as PortionScaleRequest;

    if (!(body.recipeVersionId && body.targetPortions && body.currentYield)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await scaleRecipeCost(
      body.recipeVersionId,
      body.targetPortions,
      body.currentYield
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error scaling recipe cost:", error);
    return NextResponse.json(
      { error: "Failed to scale recipe cost" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  _params: { params: Promise<{ recipeVersionId: string }> }
) {
  try {
    const body = await request.json();
    const { recipeIngredientId, wasteFactor } = body;

    if (!recipeIngredientId || typeof wasteFactor !== "number") {
      return NextResponse.json(
        { error: "recipeIngredientId and wasteFactor are required" },
        { status: 400 }
      );
    }

    await updateRecipeIngredientWasteFactor(recipeIngredientId, wasteFactor);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating waste factor:", error);
    return NextResponse.json(
      { error: "Failed to update waste factor" },
      { status: 500 }
    );
  }
}
