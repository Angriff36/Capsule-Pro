/**
 * Prep-list seed middleware.
 *
 * Completes the declarative `on EventConfirmed run PrepList.create` reaction
 * (manifest/source/platform/reactions.manifest): the reaction creates a prep
 * list SHELL marked `[auto-seed:event-confirmed]` in notes; this middleware
 * fires on the resulting PrepListCreated emission and performs the part the
 * DSL cannot express — the menu->ingredient derivation across EventDish ->
 * Dish -> RecipeVersion -> RecipeIngredient -> Ingredient stores — then
 * imports the result through governed dispatches only:
 *   PrepListItem.create per aggregated ingredient line, then
 *   PrepList.createFromSeed on the same instance (re-titles the list from the
 *   real Event.title and sets totalItems through the DSL seed contract).
 *
 * Scaling matches the legacy app derivation: scaled = lineQuantity *
 * batchMultiplier * (dish.quantityServings / recipeVersion.yieldQuantity),
 * aggregated per ingredient across dishes. Station assignment is the same
 * keyword mapping the kitchen UI uses.
 *
 * Every skip reports through `onDiagnostic` — never silent.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface PrepSeedDiagnostic {
  detail?: Record<string, unknown>;
  eventId?: string;
  prepListId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface PrepListSeedMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: PrepSeedDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

/** Marker the EventConfirmed reaction writes into the shell's notes. */
export const AUTO_SEED_MARKER = "[auto-seed:event-confirmed]";

interface EventLike {
  id?: unknown;
  tenantId?: unknown;
  title?: unknown;
}

interface EventDishLike {
  deletedAt?: unknown;
  dishId?: unknown;
  eventId?: unknown;
  id?: unknown;
  quantityServings?: unknown;
  tenantId?: unknown;
}

interface DishLike {
  deletedAt?: unknown;
  id?: unknown;
  name?: unknown;
  recipeId?: unknown;
  tenantId?: unknown;
}

interface RecipeVersionLike {
  id?: unknown;
  recipeId?: unknown;
  tenantId?: unknown;
  versionNumber?: unknown;
  yieldQuantity?: unknown;
}

interface RecipeIngredientLike {
  deletedAt?: unknown;
  id?: unknown;
  ingredientId?: unknown;
  isOptional?: unknown;
  preparationNotes?: unknown;
  quantity?: unknown;
  recipeVersionId?: unknown;
  tenantId?: unknown;
}

interface IngredientLike {
  allergens?: unknown;
  category?: unknown;
  deletedAt?: unknown;
  id?: unknown;
  inventoryItemId?: unknown;
  isActive?: unknown;
  name?: unknown;
  tenantId?: unknown;
}

interface InventoryItemLike {
  id?: unknown;
  tenantId?: unknown;
  unitOfMeasure?: unknown;
}

interface SeedLine {
  allergens: string;
  baseQuantity: number;
  category: string;
  dishId: string;
  dishName: string;
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  preparationNotes: string;
  recipeVersionId: string;
  scaledQuantity: number;
  unit: string;
}

const STATIONS: Record<string, string> = {
  "hot-line": "Hot Line",
  "cold-prep": "Cold Prep",
  bakery: "Bakery",
  "prep-station": "Prep Station",
  garnish: "Garnish",
};

/** Same keyword mapping as the kitchen UI's assignIngredientToStation. */
function assignStation(category: string): {
  stationId: string;
  stationName: string;
} {
  const lower = category.toLowerCase();
  const match = (keywords: string[]) => keywords.some((k) => lower.includes(k));
  let stationId = "prep-station";
  if (match(["hot", "grill", "sauté", "saute"])) {
    stationId = "hot-line";
  } else if (match(["cold", "salad", "dressing"])) {
    stationId = "cold-prep";
  } else if (match(["bake", "pastry", "dessert"])) {
    stationId = "bakery";
  } else if (match(["garnish", "herb", "decoration"])) {
    stationId = "garnish";
  }
  return { stationId, stationName: STATIONS[stationId] };
}

const defaultDiagnostic = (diag: PrepSeedDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[prep-seed:${diag.stage}] ${diag.reason}`, {
    prepListId: diag.prepListId,
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPrepListSeedMiddleware(
  options: PrepListSeedMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const createdEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PrepListCreated" &&
          ctx.entityName === "PrepList" &&
          ctx.command.name === "create" &&
          String(
            (event.payload as { notes?: unknown } | undefined)?.notes ?? ""
          ).includes(AUTO_SEED_MARKER)
      );

      for (const event of createdEvents) {
        const payload = event.payload as {
          eventId?: unknown;
          result?: { id?: unknown; tenantId?: unknown };
        };
        const prepListId =
          asNonEmptyString(payload.result?.id) ??
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const eventId = asNonEmptyString(payload.eventId);
        const tenantId =
          asNonEmptyString(payload.result?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(prepListId && eventId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `auto-seed shell missing ${prepListId ? (eventId ? "tenantId" : "eventId") : "prepListId"}`,
            prepListId,
            eventId,
            tenantId,
          });
          continue;
        }

        const stores = {
          event: storeProvider("Event"),
          eventDish: storeProvider("EventDish"),
          dish: storeProvider("Dish"),
          recipeVersion: storeProvider("RecipeVersion"),
          recipeIngredient: storeProvider("RecipeIngredient"),
          ingredient: storeProvider("Ingredient"),
          inventoryItem: storeProvider("InventoryItem"),
          prepListItem: storeProvider("PrepListItem"),
        };
        const missing = Object.entries(stores)
          .filter(([, store]) => !store)
          .map(([name]) => name);
        if (missing.length > 0) {
          onDiagnostic({
            stage: "stores",
            reason: "derivation stores unavailable — prep list left unseeded",
            prepListId,
            eventId,
            tenantId,
            detail: { missing },
          });
          continue;
        }

        // Idempotency: if the list already has items, seeding already ran.
        const existingItems = (await stores.prepListItem!.getAll()).filter(
          (row) =>
            asNonEmptyString((row as { tenantId?: unknown }).tenantId) ===
              tenantId &&
            asNonEmptyString((row as { prepListId?: unknown }).prepListId) ===
              prepListId
        );
        if (existingItems.length > 0) {
          onDiagnostic({
            stage: "dedupe",
            reason: "prep list already has items — seed skipped",
            prepListId,
            eventId,
            tenantId,
          });
          continue;
        }

        const lines = await deriveSeedLines({
          tenantId,
          eventId,
          stores: stores as Required<typeof stores> as DerivationStores,
          onDiagnostic,
          prepListId,
        });

        if (lines.length === 0) {
          onDiagnostic({
            stage: "derive",
            reason:
              "event has no derivable menu demand (no dishes, recipes, or ingredient lines) — prep list shell left empty",
            prepListId,
            eventId,
            tenantId,
          });
          continue;
        }

        const commonOptions = {
          correlationId:
            asNonEmptyString(
              (ctx as { correlationId?: unknown }).correlationId
            ) ?? prepListId,
          causationId: "PrepListCreated",
        };

        let createdCount = 0;
        for (const [index, line] of lines.entries()) {
          const itemResult = await dispatchCommand(
            "create",
            {
              id: randomUUID(),
              tenantId,
              prepListId,
              stationId: assignStation(line.category).stationId,
              stationName: assignStation(line.category).stationName,
              ingredientId: line.ingredientId,
              ingredientName: line.ingredientName,
              category: line.category,
              baseQuantity: line.baseQuantity,
              baseUnit: line.unit,
              scaledQuantity: line.scaledQuantity,
              scaledUnit: line.unit,
              isOptional: line.isOptional,
              preparationNotes: line.preparationNotes,
              allergens: line.allergens,
              dietarySubstitutions: "",
              dishId: line.dishId,
              dishName: line.dishName,
              recipeVersionId: line.recipeVersionId,
              sortOrder: index + 1,
            },
            {
              entityName: "PrepListItem",
              ...commonOptions,
              idempotencyKey: `prep-seed:${tenantId}:${prepListId}:item:${line.ingredientId}`,
            }
          );
          if (itemResult.emittedEvents) {
            ctx.emittedEvents.push(...itemResult.emittedEvents);
          }
          if (!itemResult.success) {
            onDiagnostic({
              stage: "seed",
              reason: `PrepListItem.create failed for ${line.ingredientName}: ${itemResult.error ?? "unknown"}`,
              prepListId,
              eventId,
              tenantId,
            });
            continue;
          }
          createdCount += 1;
        }

        if (createdCount === 0) {
          onDiagnostic({
            stage: "seed",
            reason: "no prep list items could be created — totals left at 0",
            prepListId,
            eventId,
            tenantId,
          });
          continue;
        }

        // Re-title from the real event and record totals through the DSL seed
        // contract (createFromSeed re-initializes a draft in place and sets
        // totalItems = validInstructionLines).
        const eventRow = (await stores.event!.getById(eventId)) as
          | EventLike
          | undefined;
        const eventTitle =
          asNonEmptyString(eventRow?.title) ?? `Event ${eventId.slice(0, 8)}`;
        const dishes = [...new Set(lines.map((line) => line.dishName))];
        const seedResult = await dispatchCommand(
          "createFromSeed",
          {
            eventId,
            name: `${eventTitle} - Prep List`.replace(/\s+/g, " ").trim(),
            batchMultiplier: 1,
            dietaryRestrictions: "",
            notes: `${AUTO_SEED_MARKER} ${createdCount} items from ${dishes.length} dish(es)`,
            menuGroupsJson: JSON.stringify({ dishes }),
            totalInstructionLines: createdCount,
            validInstructionLines: createdCount,
          },
          {
            entityName: "PrepList",
            instanceId: prepListId,
            ...commonOptions,
            idempotencyKey: `prep-seed:${tenantId}:${prepListId}:seed`,
          }
        );
        if (seedResult.emittedEvents) {
          ctx.emittedEvents.push(...seedResult.emittedEvents);
        }
        if (!seedResult.success) {
          onDiagnostic({
            stage: "seed",
            reason: `PrepList.createFromSeed failed: ${seedResult.error ?? "unknown"}`,
            prepListId,
            eventId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `prep list seeded with ${createdCount} item(s) from ${dishes.length} dish(es); list is a reviewable draft`,
          prepListId,
          eventId,
          tenantId,
        });
      }

      return {};
    },
  };
}

interface DerivationStores {
  dish: Store;
  event: Store;
  eventDish: Store;
  ingredient: Store;
  inventoryItem: Store;
  prepListItem: Store;
  recipeIngredient: Store;
  recipeVersion: Store;
}

async function deriveSeedLines(options: {
  tenantId: string;
  eventId: string;
  prepListId: string;
  stores: DerivationStores;
  onDiagnostic: (diag: PrepSeedDiagnostic) => void;
}): Promise<SeedLine[]> {
  const { tenantId, eventId, prepListId, stores, onDiagnostic } = options;

  const eventDishes = (await stores.eventDish.getAll())
    .map((row) => row as EventDishLike)
    .filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.eventId) === eventId &&
        row.deletedAt == null
    );

  /** key = resolved inventory/ingredient id */
  const aggregated = new Map<string, SeedLine>();

  for (const eventDish of eventDishes) {
    const dishId = asNonEmptyString(eventDish.dishId);
    if (!dishId) {
      continue;
    }
    const dish = (await stores.dish.getById(dishId)) as DishLike | undefined;
    const recipeId = asNonEmptyString(dish?.recipeId);
    if (!dish || dish.deletedAt != null || !recipeId) {
      onDiagnostic({
        stage: "derive",
        reason: "event dish skipped: dish missing, deleted, or has no recipe",
        prepListId,
        eventId,
        tenantId,
        detail: { dishId },
      });
      continue;
    }

    const versions = (await stores.recipeVersion.getAll())
      .map((row) => row as RecipeVersionLike)
      .filter(
        (row) =>
          asNonEmptyString(row.tenantId) === tenantId &&
          asNonEmptyString(row.recipeId) === recipeId
      )
      .sort(
        (a, b) =>
          (asFiniteNumber(b.versionNumber) ?? 0) -
          (asFiniteNumber(a.versionNumber) ?? 0)
      );
    const version = versions[0];
    const recipeVersionId = asNonEmptyString(version?.id);
    if (!recipeVersionId) {
      onDiagnostic({
        stage: "derive",
        reason: "dish skipped: recipe has no versions",
        prepListId,
        eventId,
        tenantId,
        detail: { dishId, recipeId },
      });
      continue;
    }

    const yieldQuantity = Math.max(
      asFiniteNumber(version?.yieldQuantity) ?? 1,
      1
    );
    const servings = Math.max(
      asFiniteNumber(eventDish.quantityServings) ?? 1,
      1
    );
    const factor = servings / yieldQuantity;
    const dishName = asNonEmptyString(dish.name) ?? dishId;

    const ingredientLines = (await stores.recipeIngredient.getAll())
      .map((row) => row as RecipeIngredientLike)
      .filter(
        (row) =>
          asNonEmptyString(row.tenantId) === tenantId &&
          asNonEmptyString(row.recipeVersionId) === recipeVersionId &&
          row.deletedAt == null
      );

    for (const line of ingredientLines) {
      const ingredientEntityId = asNonEmptyString(line.ingredientId);
      const quantity = asFiniteNumber(line.quantity);
      if (!ingredientEntityId || quantity === undefined || quantity <= 0) {
        continue;
      }

      const ingredient = (await stores.ingredient.getById(
        ingredientEntityId
      )) as IngredientLike | undefined;
      if (
        !ingredient ||
        ingredient.deletedAt != null ||
        ingredient.isActive === false ||
        asNonEmptyString(ingredient.tenantId) !== tenantId
      ) {
        onDiagnostic({
          stage: "derive",
          reason:
            "ingredient line skipped: ingredient missing, deleted, or inactive",
          prepListId,
          eventId,
          tenantId,
          detail: { ingredientId: ingredientEntityId, dishId },
        });
        continue;
      }

      // Prefer the inventory item id so downstream demand (reserve + vendor
      // catalog matching) connects to real inventory rows.
      const resolvedId =
        asNonEmptyString(ingredient.inventoryItemId) ?? ingredientEntityId;
      const inventoryItem = (await stores.inventoryItem.getById(resolvedId)) as
        | InventoryItemLike
        | undefined;
      const unit = asNonEmptyString(inventoryItem?.unitOfMeasure) ?? "each";
      const scaled = quantity * factor;

      const existing = aggregated.get(resolvedId);
      if (existing) {
        existing.baseQuantity = round3(existing.baseQuantity + quantity);
        existing.scaledQuantity = round3(existing.scaledQuantity + scaled);
        existing.isOptional = existing.isOptional && line.isOptional === true;
      } else {
        aggregated.set(resolvedId, {
          ingredientId: resolvedId,
          ingredientName: asNonEmptyString(ingredient.name) ?? resolvedId,
          category: asNonEmptyString(ingredient.category) ?? "",
          allergens: asNonEmptyString(ingredient.allergens) ?? "",
          unit,
          baseQuantity: round3(quantity),
          scaledQuantity: round3(scaled),
          isOptional: line.isOptional === true,
          preparationNotes: asNonEmptyString(line.preparationNotes) ?? "",
          dishId,
          dishName,
          recipeVersionId,
        });
      }
    }
  }

  return [...aggregated.values()];
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
