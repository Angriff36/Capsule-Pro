import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { notFound } from "next/navigation";

import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { DeleteEventButton } from "../components/delete-event-button";
import { EventExportButton } from "./components/export-button";
import { EventDetailsClient } from "./event-details-client";
import type {
  EventDishSummary,
  InventoryCoverageItem,
  RecipeDetailSummary,
  RelatedEventSummary,
} from "./event-details-types";
import { serializePrepTasks, validatePrepTasks } from "./prep-task-contract";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function isEventIdUuid(value: string): boolean {
  return EVENT_ID_UUID_REGEX.test(value);
}

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

const EventDetailsPage = async ({ params }: EventDetailsPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  if (!isEventIdUuid(eventId)) {
    // Invalid path segment like "/events/settings" should not reach this page
    // Fail fast to avoid "invalid input syntax for type uuid" errors from Postgres
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
      deletedAt: null,
    },
  });

  if (!event) {
    notFound();
  }

  const rsvpCount = await database.eventGuest.count({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
  });

  type EventDishRow = {
    linkId: string;
    dishId: string;
    name: string;
    category: string | null;
    recipeId: string | null;
    recipeName: string | null;
    course: string | null;
    quantityServings: number;
    dietaryTags: string[] | null;
    presentationImageUrl: string | null;
    pricePerPerson: Prisma.Decimal | null;
    costPerPerson: Prisma.Decimal | null;
  };

  const rawEventDishes = await database.$queryRaw<EventDishRow[]>(
    Prisma.sql`
      SELECT
        ed.id AS "linkId",
        d.id AS "dishId",
        d.name,
        d.category,
        d.recipe_id AS "recipeId",
        r.name AS "recipeName",
        ed.course,
        ed.quantity_servings AS "quantityServings",
        d.dietary_tags AS "dietaryTags",
        d.presentation_image_url AS "presentationImageUrl",
        d.price_per_person AS "pricePerPerson",
        d.cost_per_person AS "costPerPerson"
      FROM tenant_events.event_dishes ed
      JOIN tenant_kitchen.dishes d
        ON d.tenant_id = ed.tenant_id
        AND d.id = ed.dish_id
        AND d.deleted_at IS NULL
      LEFT JOIN tenant_kitchen.recipes r
        ON r.tenant_id = d.tenant_id
        AND r.id = d.recipe_id
        AND r.deleted_at IS NULL
      WHERE ed.tenant_id = ${tenantId}
        AND ed.event_id = ${eventId}
        AND ed.deleted_at IS NULL
      ORDER BY ed.course ASC, d.name ASC
    `
  );

  const eventDishes: EventDishSummary[] = rawEventDishes.map((row) => ({
    linkId: row.linkId,
    dishId: row.dishId,
    name: row.name,
    category: row.category,
    recipeId: row.recipeId,
    recipeName: row.recipeName,
    course: row.course,
    quantityServings: row.quantityServings,
    dietaryTags: row.dietaryTags ?? [],
    presentationImageUrl: row.presentationImageUrl,
    pricePerPerson: row.pricePerPerson ? Number(row.pricePerPerson) : null,
    costPerPerson: row.costPerPerson ? Number(row.costPerPerson) : null,
  }));

  const recipeIds = Array.from(
    new Set(eventDishes.map((dish) => dish.recipeId).filter(Boolean))
  ) as string[];

  let recipeDetails: RecipeDetailSummary[] = [];
  let inventoryCoverage: InventoryCoverageItem[] = [];

  if (recipeIds.length > 0) {
    type RecipeVersionRow = {
      recipeId: string;
      recipeName: string;
      versionId: string;
      yieldQuantity: Prisma.Decimal;
      yieldUnitCode: string | null;
      instructions: string | null;
      prepTimeMinutes: number | null;
      cookTimeMinutes: number | null;
      restTimeMinutes: number | null;
    };

    const recipeVersions = await database.$queryRaw<RecipeVersionRow[]>(
      Prisma.sql`
        SELECT DISTINCT ON (rv.recipe_id)
          rv.recipe_id AS "recipeId",
          r.name AS "recipeName",
          rv.id AS "versionId",
          rv.yield_quantity AS "yieldQuantity",
          u.code AS "yieldUnitCode",
          rv.instructions AS "instructions",
          rv.prep_time_minutes AS "prepTimeMinutes",
          rv.cook_time_minutes AS "cookTimeMinutes",
          rv.rest_time_minutes AS "restTimeMinutes"
        FROM tenant_kitchen.recipe_versions rv
        JOIN tenant_kitchen.recipes r
          ON r.tenant_id = rv.tenant_id
          AND r.id = rv.recipe_id
          AND r.deleted_at IS NULL
        LEFT JOIN core.units u ON u.id = rv.yield_unit_id
        WHERE rv.tenant_id = ${tenantId}
          AND rv.recipe_id IN (${Prisma.join(recipeIds)})
          AND rv.deleted_at IS NULL
        ORDER BY rv.recipe_id, rv.version_number DESC
      `
    );

    const recipeVersionIds = recipeVersions.map((row) => row.versionId);

    type RecipeIngredientRow = {
      recipeVersionId: string;
      ingredientId: string;
      ingredientName: string;
      quantity: Prisma.Decimal;
      unitCode: string | null;
      preparationNotes: string | null;
      isOptional: boolean;
    };

    const recipeIngredients =
      recipeVersionIds.length > 0
        ? await database.$queryRaw<RecipeIngredientRow[]>(
            Prisma.sql`
              SELECT
                ri.recipe_version_id AS "recipeVersionId",
                i.id AS "ingredientId",
                i.name AS "ingredientName",
                ri.quantity AS "quantity",
                u.code AS "unitCode",
                ri.preparation_notes AS "preparationNotes",
                ri.is_optional AS "isOptional"
              FROM tenant_kitchen.recipe_ingredients ri
              JOIN tenant_kitchen.ingredients i
                ON i.tenant_id = ri.tenant_id
                AND i.id = ri.ingredient_id
                AND i.deleted_at IS NULL
              LEFT JOIN core.units u ON u.id = ri.unit_id
              WHERE ri.tenant_id = ${tenantId}
                AND ri.recipe_version_id IN (${Prisma.join(recipeVersionIds)})
                AND ri.deleted_at IS NULL
              ORDER BY ri.sort_order ASC, i.name ASC
            `
          )
        : [];

    type RecipeStepRow = {
      recipeVersionId: string;
      stepNumber: number;
      instruction: string;
      durationMinutes: number | null;
      temperatureValue: Prisma.Decimal | null;
      temperatureUnit: string | null;
      equipmentNeeded: string[];
      tips: string | null;
    };

    const recipeSteps =
      recipeVersionIds.length > 0
        ? await database.$queryRaw<RecipeStepRow[]>(
            Prisma.sql`
              SELECT
                rs.recipe_version_id AS "recipeVersionId",
                rs.step_number AS "stepNumber",
                rs.instruction AS "instruction",
                rs.duration_minutes AS "durationMinutes",
                rs.temperature_value AS "temperatureValue",
                rs.temperature_unit AS "temperatureUnit",
                rs.equipment_needed AS "equipmentNeeded",
                rs.tips AS "tips"
              FROM tenant_kitchen.recipe_steps rs
              WHERE rs.tenant_id = ${tenantId}
                AND rs.recipe_version_id IN (${Prisma.join(recipeVersionIds)})
                AND rs.deleted_at IS NULL
              ORDER BY rs.step_number ASC
            `
          )
        : [];

    const recipeByVersionId = new Map<string, RecipeDetailSummary>();
    const recipeById = new Map<string, RecipeDetailSummary>();

    for (const row of recipeVersions) {
      const detail: RecipeDetailSummary = {
        recipeId: row.recipeId,
        recipeName: row.recipeName,
        versionId: row.versionId,
        yieldQuantity: Number(row.yieldQuantity),
        yieldUnitCode: row.yieldUnitCode,
        instructions: row.instructions,
        prepTimeMinutes: row.prepTimeMinutes,
        cookTimeMinutes: row.cookTimeMinutes,
        restTimeMinutes: row.restTimeMinutes,
        ingredients: [],
        steps: [],
      };
      recipeByVersionId.set(row.versionId, detail);
      recipeById.set(row.recipeId, detail);
    }

    for (const ingredient of recipeIngredients) {
      const recipe = recipeByVersionId.get(ingredient.recipeVersionId);
      if (!recipe) {
        continue;
      }
      recipe.ingredients.push({
        ingredientId: ingredient.ingredientId,
        ingredientName: ingredient.ingredientName,
        quantity: Number(ingredient.quantity),
        unitCode: ingredient.unitCode,
        preparationNotes: ingredient.preparationNotes,
        isOptional: ingredient.isOptional,
      });
    }

    for (const step of recipeSteps) {
      const recipe = recipeByVersionId.get(step.recipeVersionId);
      if (!recipe) {
        continue;
      }
      recipe.steps.push({
        stepNumber: step.stepNumber,
        instruction: step.instruction,
        durationMinutes: step.durationMinutes,
        temperatureValue:
          step.temperatureValue === null ? null : Number(step.temperatureValue),
        temperatureUnit: step.temperatureUnit,
        equipmentNeeded: step.equipmentNeeded,
        tips: step.tips,
      });
    }

    recipeDetails = Array.from(recipeById.values());

    const ingredientIds = Array.from(
      new Set(recipeIngredients.map((ingredient) => ingredient.ingredientId))
    );

    if (ingredientIds.length > 0) {
      type InventoryItemRow = {
        inventoryItemId: string;
        ingredientId: string;
        itemName: string;
        parLevel: Prisma.Decimal | null;
      };

      const inventoryItems = await database.$queryRaw<InventoryItemRow[]>(
        Prisma.sql`
          SELECT
            ii.id AS "inventoryItemId",
            i.id AS "ingredientId",
            ii.name AS "itemName",
            ii.reorder_level AS "parLevel"
          FROM tenant_inventory.inventory_items ii
          JOIN tenant_kitchen.ingredients i
            ON i.tenant_id = ii.tenant_id
            AND i.name = ii.name
            AND i.deleted_at IS NULL
          WHERE ii.tenant_id = ${tenantId}
            AND i.id IN (${Prisma.join(ingredientIds)})
            AND ii.deleted_at IS NULL
        `
      );

      const inventoryItemIds = inventoryItems.map(
        (item) => item.inventoryItemId
      );

      type InventoryStockRow = {
        itemId: string;
        onHand: Prisma.Decimal;
        unitCode: string | null;
      };

      const inventoryStock =
        inventoryItemIds.length > 0
          ? await database.$queryRaw<InventoryStockRow[]>(
              Prisma.sql`
                SELECT
                  s.item_id AS "itemId",
                  SUM(s.quantity_on_hand) AS "onHand",
                  u.code AS "unitCode"
                FROM tenant_inventory.inventory_stock s
                LEFT JOIN core.units u ON u.id = s.unit_id
                WHERE s.tenant_id = ${tenantId}
                  AND s.item_id IN (${Prisma.join(inventoryItemIds)})
                GROUP BY s.item_id, u.code
              `
            )
          : [];

      const stockByItem = new Map<
        string,
        { onHand: number; unitCode: string | null }
      >();

      for (const stock of inventoryStock) {
        const existing = stockByItem.get(stock.itemId);
        const onHandValue = Number(stock.onHand);
        if (existing) {
          existing.onHand += onHandValue;
          continue;
        }
        stockByItem.set(stock.itemId, {
          onHand: onHandValue,
          unitCode: stock.unitCode,
        });
      }

      inventoryCoverage = inventoryItems.map((item) => {
        const stock = stockByItem.get(item.inventoryItemId);
        return {
          ingredientId: item.ingredientId,
          inventoryItemId: item.inventoryItemId,
          itemName: item.itemName,
          onHand: stock ? stock.onHand : null,
          onHandUnitCode: stock ? stock.unitCode : null,
          parLevel: item.parLevel ? Number(item.parLevel) : null,
        };
      });
    }
  }

  type PrepTaskRow = {
    id: string;
    name: string;
    status: string;
    quantityTotal: unknown;
    servingsTotal: unknown;
    dueByDate: unknown;
    isEventFinish: unknown;
  };

  const rawPrepTasks = await database.$queryRaw<PrepTaskRow[]>(
    Prisma.sql`
      SELECT id,
             name,
             status,
             quantity_total AS "quantityTotal",
             servings_total AS "servingsTotal",
             due_by_date AS "dueByDate",
             is_event_finish AS "isEventFinish"
      FROM tenant_kitchen.prep_tasks
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
      ORDER BY due_by_date ASC, created_at ASC
    `
  );

  const normalizedPrepTasks = rawPrepTasks.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    quantityTotal: row.quantityTotal,
    servingsTotal: row.servingsTotal ?? null,
    dueByDate:
      row.dueByDate instanceof Date
        ? row.dueByDate
        : new Date(row.dueByDate as string | number),
    isEventFinish: Boolean(row.isEventFinish),
  }));

  const prepTasks = validatePrepTasks(normalizedPrepTasks);
  const prepTasksForClient: Awaited<ReturnType<typeof serializePrepTasks>> =
    serializePrepTasks(prepTasks);

  const relatedEvents = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
      NOT: { id: eventId },
    },
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
  });

  const relatedEventIds = relatedEvents.map((related) => related.id);

  const relatedGuestCounts =
    relatedEventIds.length > 0
      ? await database.eventGuest.groupBy({
          by: ["eventId"],
          where: {
            tenantId,
            deletedAt: null,
            eventId: { in: relatedEventIds },
          },
          _count: { _all: true },
        })
      : [];

  const relatedGuestCountMap = new Map(
    relatedGuestCounts.map((row) => [row.eventId, row._count._all])
  );

  const relatedEventsForClient: RelatedEventSummary[] = relatedEvents.map(
    (related) => ({
      id: related.id,
      title: related.title,
      eventType: related.eventType,
      eventDate: related.eventDate.toISOString(),
      guestCount: related.guestCount,
      status: related.status,
      venueName: related.venueName,
      venueAddress: related.venueAddress,
      ticketPrice:
        related.ticketPrice === null ? null : Number(related.ticketPrice),
      ticketTier: related.ticketTier,
      eventFormat: related.eventFormat,
      accessibilityOptions: related.accessibilityOptions ?? [],
      featuredMediaUrl: related.featuredMediaUrl,
      tags: related.tags ?? [],
    })
  );

  // Budget model does not exist in schema - set to null
  const budget: null = null;

  return (
    <>
      <Header page={event.title} pages={["Operations", "Events"]}>
        <div className="flex items-center gap-2">
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href={`/events/${eventId}/battle-board`}
          >
            Battle Board
          </a>
          <EventExportButton eventId={eventId} eventName={event.title} />
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href="/events"
          >
            Back to events
          </a>
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href="/events/import"
          >
            Import new
          </a>
          <DeleteEventButton
            eventId={eventId}
            eventTitle={event.title}
            size="sm"
          />
        </div>
      </Header>
      <EventDetailsClient
        budget={budget}
        event={{
          ...event,
          budget: event.budget === null ? null : Number(event.budget),
          ticketPrice:
            event.ticketPrice === null ? null : Number(event.ticketPrice),
        }}
        eventDishes={eventDishes}
        inventoryCoverage={inventoryCoverage}
        prepTasks={prepTasksForClient}
        recipeDetails={recipeDetails}
        relatedEvents={relatedEventsForClient}
        relatedGuestCounts={Object.fromEntries(relatedGuestCountMap)}
        rsvpCount={rsvpCount}
        tenantId={tenantId}
      />
    </>
  );
};

export default EventDetailsPage;
