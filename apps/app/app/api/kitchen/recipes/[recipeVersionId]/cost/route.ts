import { NextResponse } from "next/server";
import {
  getRecipeCostSummary,
  recalculateRecipeCosts,
} from "@/app/lib/recipe-costing";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeVersionId: string }> }
) {
  try {
    const { recipeVersionId } = await params;
    const costSummary = await getRecipeCostSummary(recipeVersionId);

    if (!costSummary) {
      return NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(costSummary);
  } catch (error) {
    console.error("Error fetching recipe cost:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe cost" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recipeVersionId: string }> }
) {
  try {
    const { recipeVersionId } = await params;
    const costSummary = await recalculateRecipeCosts(recipeVersionId);

    if (!costSummary) {
      return NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(costSummary);
  } catch (error) {
    console.error("Error recalculating recipe cost:", error);
    return NextResponse.json(
      { error: "Failed to recalculate recipe cost" },
      { status: 500 }
    );
  }
}
