/**
 * @module UpdateDishAllergens
 * @intent Handle API requests to update allergen and dietary tag information for dishes
 * @responsibility Validate request, update dish allergens in database, return success/error response
 * @domain Kitchen
 * @tags allergens, api, dishes, dietary-restrictions
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UpdateDishAllergensRequest {
  id: string;
  tenantId: string;
  allergens: string[];
  dietaryTags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: UpdateDishAllergensRequest = await request.json();
    const { id, tenantId, allergens, dietaryTags } = body;

    // Validate required fields
    if (!id || !tenantId) {
      return NextResponse.json(
        { error: "Missing required fields: id and tenantId" },
        { status: 400 }
      );
    }

    // Validate allergens array
    if (!Array.isArray(allergens)) {
      return NextResponse.json(
        { error: "allergens must be an array" },
        { status: 400 }
      );
    }

    // Validate dietaryTags array
    if (!Array.isArray(dietaryTags)) {
      return NextResponse.json(
        { error: "dietaryTags must be an array" },
        { status: 400 }
      );
    }

    // Verify tenant matches
    if (tenantId !== orgId) {
      return NextResponse.json(
        { error: "Tenant mismatch" },
        { status: 403 }
      );
    }

    // Update dish allergens
    const updatedDish = await database.dish.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
        deletedAt: null,
      },
      data: {
        allergens,
        dietaryTags,
      },
    });

    return NextResponse.json({
      success: true,
      dish: {
        id: updatedDish.id,
        name: updatedDish.name,
        allergens: updatedDish.allergens,
        dietaryTags: updatedDish.dietaryTags,
      },
    });
  } catch (error) {
    console.error("Error updating dish allergens:", error);

    // Handle specific Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] } };

      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Dish not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update dish allergens" },
      { status: 500 }
    );
  }
}
