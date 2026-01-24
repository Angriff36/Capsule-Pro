/**
 * @module UpdateDishAllergens
 * @intent Handle API requests to update allergen and dietary tag information for dishes
 * @responsibility Validate request, update dish allergens in database, return success/error response
 * @domain Kitchen
 * @tags allergens, api, dishes, dietary-restrictions
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
exports.runtime = "nodejs";
exports.dynamic = "force-dynamic";
async function POST(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { id, tenantId, allergens, dietaryTags } = body;
    // Validate required fields
    if (!(id && tenantId)) {
      return server_2.NextResponse.json(
        { error: "Missing required fields: id and tenantId" },
        { status: 400 }
      );
    }
    // Validate allergens array
    if (!Array.isArray(allergens)) {
      return server_2.NextResponse.json(
        { error: "allergens must be an array" },
        { status: 400 }
      );
    }
    // Validate dietaryTags array
    if (!Array.isArray(dietaryTags)) {
      return server_2.NextResponse.json(
        { error: "dietaryTags must be an array" },
        { status: 400 }
      );
    }
    // Verify tenant matches
    if (tenantId !== orgId) {
      return server_2.NextResponse.json(
        { error: "Tenant mismatch" },
        { status: 403 }
      );
    }
    // Update dish allergens
    const updatedDish = await database_1.database.dish.update({
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
    return server_2.NextResponse.json({
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
      const prismaError = error;
      if (prismaError.code === "P2025") {
        return server_2.NextResponse.json(
          { error: "Dish not found" },
          { status: 404 }
        );
      }
    }
    return server_2.NextResponse.json(
      { error: "Failed to update dish allergens" },
      { status: 500 }
    );
  }
}
