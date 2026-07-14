import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(
  _request: NextRequest,
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
            companyName: true,
            firstName: true,
            lastName: true,
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
      ? event.client.companyName ||
        `${event.client.firstName ?? ""} ${event.client.lastName ?? ""}`.trim() ||
        null
      : null;

    // Tier 0 — four independent reads, all keyed only on (eventId, tenantId).
    // Batching collapses what used to be 4 serial round-trips (with the dish +
    // staff chains waiting behind them) into one concurrent batch. In the prior
    // serial layout these ran battleBoard → eventDishLinks → …dish chain… →
    // eventStaff → staffMember → eventTimeline (10 deep); eventStaff/timeline
    // now race alongside battleBoard/eventDishLinks instead of trailing it.
    const [battleBoard, eventDishLinks, staffAssignments, timelineItems] =
      await Promise.all([
        // Check for finalized battle board
        database.battleBoard.findFirst({
          where: { eventId, tenantId, status: "finalized", deletedAt: null },
          select: { id: true, boardName: true },
        }),
        // Fetch event-dish links (starts the dish/recipe chain). Strict
        // projection of the 3 fields consumed downstream (dishId → dish lookup
        // + shopping-list scaling; course → response; quantityServings →
        // servings + scale factor); drops 8 unused columns/row (id, tenantId,
        // deletedAt, eventId, specialInstructions, serviceStyle, createdAt,
        // updatedAt) — `where` filters are independent of `select`.
        database.eventDish.findMany({
          where: { eventId, tenantId, deletedAt: null },
          orderBy: { course: "asc" },
          select: { dishId: true, course: true, quantityServings: true },
        }),
        // Fetch staff assignments (starts the staff chain)
        database.eventStaff.findMany({
          where: { eventId, tenantId, deletedAt: null },
          select: {
            id: true,
            staffMemberId: true,
            role: true,
            shiftStart: true,
            shiftEnd: true,
            notes: true,
          },
        }),
        // Fetch timeline items (terminal — no further reads depend on it)
        database.eventTimeline.findMany({
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
        }),
      ]);

    // Tier 1 — dish (depends on eventDishLinks) ‖ staffMember (depends on
    // staffAssignments). The two chains are independent of each other; batching
    // runs the staff fetch in parallel with the dish fetch instead of after the
    // entire dish/recipe chain.
    const dishIds = eventDishLinks.map((ed) => ed.dishId);
    const staffMemberIds = staffAssignments.map((sa) => sa.staffMemberId);
    const [dishes, staffMembers] = await Promise.all([
      dishIds.length > 0
        ? database.dish.findMany({
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
        : Promise.resolve([]),
      staffMemberIds.length > 0
        ? database.staffMember.findMany({
            where: { id: { in: staffMemberIds }, tenantId, deletedAt: null },
            select: { id: true, displayName: true, role: true },
          })
        : Promise.resolve([]),
    ]);
    const dishById = new Map(dishes.map((d) => [d.id, d]));
    const staffMemberById = new Map(
      staffMembers.map(
        (e: { id: string; displayName: string; role: string | null }) => [
          e.id,
          e,
        ]
      )
    );

    // Fetch latest recipe version for each recipe (for ingredient aggregation).
    // distinct:["recipeId"] + orderBy versionNumber desc bounds the read to one
    // row per recipe (the latest) instead of every version; the dedup map below
    // remains the correctness floor.
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
            distinct: ["recipeId"],
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

    const staff = staffAssignments.map((sa) => {
      const member = staffMemberById.get(sa.staffMemberId);
      return {
        id: sa.staffMemberId,
        name: member?.displayName ?? "Unknown",
        role: member?.role ?? null,
        assignmentRole: sa.role,
      };
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
      if (!(dish && recipeVersion)) {
        continue;
      }
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
