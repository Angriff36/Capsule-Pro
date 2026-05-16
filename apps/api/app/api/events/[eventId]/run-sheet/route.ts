import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 403 });
    }

    const event = await database.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventType: true,
        venueName: true,
        venueAddress: true,
        guestCount: true,
        status: true,
        notes: true,
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const clientName = event.client
      ? event.client.company_name ||
        `${event.client.first_name ?? ""} ${event.client.last_name ?? ""}`.trim() ||
        null
      : null;

    // Check for finalized battle board
    const battleBoard = await database.battleBoard.findFirst({
      where: { eventId, tenantId, status: "finalized", deletedAt: null },
      select: { id: true, board_name: true },
    });

    // Fetch event-dish links
    const eventDishLinks = await database.eventDish.findMany({
      where: { eventId, tenantId, deletedAt: null },
      orderBy: { course: "asc" },
    });

    // Fetch dish details
    const dishIds = eventDishLinks.map((ed) => ed.dishId);
    const dishes =
      dishIds.length > 0
        ? await database.dish.findMany({
            where: { id: { in: dishIds }, tenantId, deletedAt: null },
            select: {
              id: true,
              name: true,
              description: true,
              allergens: true,
              dietaryTags: true,
              recipeId: true,
            },
          })
        : [];
    const dishById = new Map(dishes.map((d) => [d.id, d]));

    // Fetch latest recipe version for each recipe (for ingredient aggregation)
    const recipeIds = dishes.map((d) => d.recipeId).filter(Boolean);
    const recipeVersions =
      recipeIds.length > 0
        ? await database.recipeVersion.findMany({
            where: { recipeId: { in: recipeIds }, tenantId, deletedAt: null },
            select: {
              id: true,
              recipeId: true,
              yieldQuantity: true,
              prepTimeMinutes: true,
              cookTimeMinutes: true,
              instructions: true,
            },
            orderBy: { versionNumber: "desc" },
          })
        : [];

    // Get latest version per recipe
    const latestVersionByRecipe = new Map<
      string,
      (typeof recipeVersions)[number]
    >();
    for (const rv of recipeVersions) {
      if (!latestVersionByRecipe.has(rv.recipeId)) {
        latestVersionByRecipe.set(rv.recipeId, rv);
      }
    }

    // Fetch recipe ingredients for the latest versions
    const versionIds = Array.from(latestVersionByRecipe.values()).map(
      (rv) => rv.id
    );
    const recipeIngredients =
      versionIds.length > 0
        ? await database.recipeIngredient.findMany({
            where: {
              recipeVersionId: { in: versionIds },
              tenantId,
              deletedAt: null,
            },
            select: {
              recipeVersionId: true,
              ingredientId: true,
              quantity: true,
              unitId: true,
              preparationNotes: true,
              isOptional: true,
            },
          })
        : [];

    // Group ingredients by version
    const ingredientsByVersion = new Map<string, typeof recipeIngredients>();
    for (const ing of recipeIngredients) {
      const arr = ingredientsByVersion.get(ing.recipeVersionId) ?? [];
      arr.push(ing);
      ingredientsByVersion.set(ing.recipeVersionId, arr);
    }

    // Fetch ingredient names
    const ingredientIds = recipeIngredients.map((ri) => ri.ingredientId);
    const ingredientRecords =
      ingredientIds.length > 0
        ? await database.ingredient.findMany({
            where: { id: { in: ingredientIds }, tenantId, deletedAt: null },
            select: { id: true, name: true },
          })
        : [];
    const ingredientNameById = new Map(
      ingredientRecords.map((i) => [i.id, i.name])
    );

    // Build dish entries
    const runSheetDishes = eventDishLinks.map((link) => {
      const dish = dishById.get(link.dishId);
      const recipeVersion = dish?.recipeId
        ? latestVersionByRecipe.get(dish.recipeId)
        : null;
      const ingredients = recipeVersion
        ? (ingredientsByVersion.get(recipeVersion.id) ?? [])
        : [];
      return {
        id: dish?.id ?? link.dishId,
        name: dish?.name ?? "Unknown",
        description: dish?.description ?? null,
        allergens: (dish?.allergens as string[]) ?? [],
        dietaryTags: (dish?.dietaryTags as string[]) ?? [],
        course: link.course,
        servings: link.quantityServings,
        source: battleBoard
          ? ("battle-board" as const)
          : ("event-menu" as const),
        recipe: recipeVersion
          ? {
              yieldQuantity: recipeVersion.yieldQuantity,
              prepTimeMinutes: recipeVersion.prepTimeMinutes,
              cookTimeMinutes: recipeVersion.cookTimeMinutes,
              instructions: recipeVersion.instructions,
              ingredients: ingredients.map((ing) => ({
                name: ingredientNameById.get(ing.ingredientId) ?? "Unknown",
                quantity: Number(ing.quantity),
                isOptional: ing.isOptional,
              })),
            }
          : null,
      };
    });

    // Fetch staff assignments
    const staffAssignments = await database.eventStaffAssignment.findMany({
      where: { eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        employeeId: true,
        role: true,
        startTime: true,
        endTime: true,
        notes: true,
      },
    });

    // Fetch employee details (User model = employees table)
    const employeeIds = staffAssignments.map((sa) => sa.employeeId);
    const employees =
      employeeIds.length > 0
        ? await database.user.findMany({
            where: { id: { in: employeeIds }, tenantId, deletedAt: null },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : [];
    const employeeById = new Map(
      employees.map(
        (e: {
          id: string;
          firstName: string;
          lastName: string;
          role: string;
        }) => [e.id, e]
      )
    );

    const staff = staffAssignments.map((sa) => {
      const emp = employeeById.get(sa.employeeId);
      return {
        id: sa.employeeId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
        role: emp?.role ?? null,
        assignmentRole: sa.role,
      };
    });

    // Fetch timeline items
    const timelineItems = await database.eventTimeline.findMany({
      where: { eventId, tenantId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { timelineTime: "asc" }],
      select: {
        id: true,
        timelineTime: true,
        description: true,
        responsibleRole: true,
        isCompleted: true,
        notes: true,
      },
    });

    const timeline = timelineItems.map((item) => ({
      id: item.id,
      title: item.description,
      description: item.notes,
      time: item.timelineTime?.toISOString() ?? null,
      responsibleRole: item.responsibleRole,
      isCompleted: item.isCompleted,
    }));

    // Aggregate ingredients for shopping list
    const ingredientMap = new Map<
      string,
      { name: string; quantity: number; dishes: string[] }
    >();
    for (const link of eventDishLinks) {
      const dish = dishById.get(link.dishId);
      const recipeVersion = dish?.recipeId
        ? latestVersionByRecipe.get(dish.recipeId)
        : undefined;
      if (!(dish && recipeVersion)) continue;
      const scaleFactor =
        link.quantityServings && recipeVersion.yieldQuantity
          ? link.quantityServings / Number(recipeVersion.yieldQuantity)
          : 1;
      const ings = ingredientsByVersion.get(recipeVersion.id) ?? [];
      for (const ing of ings) {
        const ingName = ingredientNameById.get(ing.ingredientId) ?? "Unknown";
        const existing = ingredientMap.get(ing.ingredientId);
        const scaledQty = Number(ing.quantity) * scaleFactor;
        if (existing) {
          existing.quantity += scaledQty;
          if (!existing.dishes.includes(dish.name)) {
            existing.dishes.push(dish.name);
          }
        } else {
          ingredientMap.set(ing.ingredientId, {
            name: ingName,
            quantity: scaledQty,
            dishes: [dish.name],
          });
        }
      }
    }

    const shoppingList = Array.from(ingredientMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        eventType: event.eventType,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        guestCount: event.guestCount,
        status: event.status,
        client: event.client
          ? {
              id: event.client.id,
              name: clientName,
              email: event.client.email,
              phone: event.client.phone,
            }
          : null,
      },
      dishes: runSheetDishes,
      staff,
      timeline,
      shoppingList,
      generatedAt: new Date().toISOString(),
      source: battleBoard ? "battle-board" : "event-menu",
    });
  } catch (error) {
    captureException(error);
    log.error("Run sheet generation failed", { error });
    return NextResponse.json(
      { error: "Failed to generate run sheet" },
      { status: 500 }
    );
  }
}
