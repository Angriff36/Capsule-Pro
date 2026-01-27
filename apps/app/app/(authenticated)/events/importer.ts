import "server-only";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";

type CsvRow = Record<string, string>;

type ImportContext = {
  tenantId: string;
  locationId: string;
  unitIds: {
    pound?: number;
    each?: number;
    ounce?: number;
    gram?: number;
    kilogram?: number;
  };
};

const normalizeHeader = (value: string) =>
  value
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const parseCsv = (input: string): CsvRow[] => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.some((value) => value.trim().length > 0)) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      pushField();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((values) => {
    const rowData: CsvRow = {};
    headers.forEach((header, idx) => {
      if (!header || rowData[header] !== undefined) {
        return;
      }
      rowData[header] = (values[idx] ?? "").trim();
    });
    return rowData;
  });
};

const getValue = (row: CsvRow, keys: string[]) => {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (row[normalized]) {
      return row[normalized];
    }
  }
  return "";
};

const parseNumber = (value: string) => {
  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) : undefined;
};

const parseQuantityUnit = (value: string) => {
  const amount = parseNumber(value);
  const unitMatch = value.match(/[a-zA-Z]+/g);
  const unit = unitMatch ? unitMatch.join(" ").toLowerCase() : "";
  return { amount, unit };
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const ensureLocationId = async (tenantId: string): Promise<string> => {
  const [location] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant.locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    `
  );

  if (location?.id) {
    return location.id;
  }

  const createdId = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant.locations (tenant_id, id, name, is_primary, is_active)
      VALUES (${tenantId}, ${createdId}, ${"Main Kitchen"}, true, true)
    `
  );

  return createdId;
};

const getFallbackUnitId = async () => {
  const [row] = await database.$queryRaw<{ id: number }[]>(
    Prisma.sql`
      SELECT id
      FROM core.units
      ORDER BY id ASC
      LIMIT 1
    `
  );
  return row?.id;
};

const getUnitIds = async () => {
  const rows = await database.$queryRaw<{ id: number; code: string }[]>(
    Prisma.sql`
      SELECT id, code
      FROM core.units
      WHERE code IN ('lb', 'ea', 'oz', 'g', 'kg')
    `
  );

  const unitIds: ImportContext["unitIds"] = {};
  rows.forEach((row) => {
    if (row.code === "lb") {
      unitIds.pound = row.id;
    }
    if (row.code === "ea") {
      unitIds.each = row.id;
    }
    if (row.code === "oz") {
      unitIds.ounce = row.id;
    }
    if (row.code === "g") {
      unitIds.gram = row.id;
    }
    if (row.code === "kg") {
      unitIds.kilogram = row.id;
    }
  });

  return unitIds;
};

const findRecipeId = async (tenantId: string, name: string) => {
  const [row] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );
  return row?.id;
};

const insertRecipe = async (
  tenantId: string,
  name: string,
  { category, tags }: { category?: string | null; tags?: string[] } = {}
) => {
  const existingId = await findRecipeId(tenantId, name);
  if (existingId) {
    return existingId;
  }

  const id = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.recipes (tenant_id, id, name, category, tags, is_active)
      VALUES (${tenantId}, ${id}, ${name}, ${category ?? null}, ${
        tags && tags.length > 0 ? tags : null
      }, true)
    `
  );
  return id;
};

const findDishId = async (tenantId: string, name: string) => {
  const [row] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.dishes
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );
  return row?.id;
};

const insertDish = async (
  tenantId: string,
  name: string,
  recipeId: string,
  category?: string | null
) => {
  const existingId = await findDishId(tenantId, name);
  if (existingId) {
    return existingId;
  }

  const id = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.dishes (tenant_id, id, recipe_id, name, category, is_active)
      VALUES (${tenantId}, ${id}, ${recipeId}, ${name}, ${category ?? null}, true)
    `
  );
  return id;
};

const findIngredientId = async (tenantId: string, name: string) => {
  const [row] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );
  return row?.id;
};

const insertIngredient = async (
  tenantId: string,
  name: string,
  defaultUnitId: number,
  category?: string | null
) => {
  const existingId = await findIngredientId(tenantId, name);
  if (existingId) {
    return existingId;
  }

  const id = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        category,
        default_unit_id,
        is_active
      )
      VALUES (${tenantId}, ${id}, ${name}, ${category ?? null}, ${defaultUnitId}, true)
    `
  );
  return id;
};

const findInventoryItemId = async (tenantId: string, name: string) => {
  const [row] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );
  return row?.id;
};

const insertInventoryItem = async (
  tenantId: string,
  name: string,
  category: string,
  tags: string[]
) => {
  const existingId = await findInventoryItemId(tenantId, name);
  if (existingId) {
    return existingId;
  }

  const id = randomUUID();
  const itemNumber = `INV-${id.slice(0, 8).toUpperCase()}`;
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_inventory.inventory_items (
        tenant_id,
        id,
        item_number,
        name,
        category,
        unit_cost,
        quantity_on_hand,
        reorder_level,
        tags
      )
      VALUES (
        ${tenantId},
        ${id},
        ${itemNumber},
        ${name},
        ${category},
        ${0},
        ${0},
        ${0},
        ${tags}
      )
    `
  );
  return id;
};

type ItemClassification = {
  kind: "dish" | "recipe" | "ingredient" | "supply";
  category?: string;
  tags: string[];
};

const SUPPLY_KEYWORDS = [
  "chafing",
  "chafer",
  "sterno",
  "serveware",
  "servingware",
  "plate",
  "utensil",
  "fork",
  "spoon",
  "knife",
  "napkin",
  "plasticware",
  "disposable",
  "tray",
  "pan",
  "lid",
  "container",
  "place setting",
  "cutlery",
  "tongs",
];

const BEVERAGE_KEYWORDS = [
  "water",
  "iced tea",
  "tea",
  "lemonade",
  "coffee",
  "juice",
  "soda",
  "beverage",
  "drink",
];

const INGREDIENT_KEYWORDS = [
  "cheese",
  "lettuce",
  "tortilla",
  "rice",
  "beans",
  "salsa",
  "cream",
  "butter",
  "onion",
  "pickles",
  "tomato",
  "cilantro",
  "lime",
  "garlic",
  "pepper",
  "salt",
];

const RECIPE_KEYWORDS = [
  "sauce",
  "reduction",
  "dressing",
  "vinaigrette",
  "aioli",
  "rub",
  "marinade",
  "glaze",
  "compote",
];

const classifyItem = (name: string, unit: string): ItemClassification => {
  const normalized = normalizeHeader(name);
  const normalizedUnit = normalizeHeader(unit);

  if (SUPPLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { kind: "supply", category: "serveware", tags: ["imported"] };
  }

  const isBeverage = BEVERAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  if (isBeverage) {
    const isPackaged =
      normalized.includes("bottle") || normalized.includes("bottled");
    if (isPackaged) {
      return { kind: "supply", category: "beverage", tags: ["imported"] };
    }
    return { kind: "dish", category: "beverage", tags: ["imported"] };
  }

  const isIngredientUnit =
    normalizedUnit.includes("lb") ||
    normalizedUnit.includes("oz") ||
    normalizedUnit.includes("g") ||
    normalizedUnit.includes("kg");

  if (
    INGREDIENT_KEYWORDS.some((keyword) => normalized.includes(keyword)) ||
    isIngredientUnit
  ) {
    return { kind: "ingredient", category: "ingredient", tags: ["imported"] };
  }

  if (RECIPE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { kind: "recipe", category: "recipe", tags: ["imported"] };
  }

  return { kind: "dish", category: "menu", tags: ["imported"] };
};

const insertEvent = async (
  tenantId: string,
  {
    title,
    eventDate,
    eventType,
    guestCount,
    notes,
  }: {
    title: string;
    eventDate: Date;
    eventType: string;
    guestCount: number;
    notes?: string;
  }
) => {
  const eventId = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.events (
        tenant_id,
        id,
        title,
        event_type,
        event_date,
        guest_count,
        status,
        notes
      )
      VALUES (
        ${tenantId},
        ${eventId},
        ${title},
        ${eventType},
        ${formatDate(eventDate)},
        ${guestCount},
        ${"confirmed"},
        ${notes ?? null}
      )
    `
  );
  return eventId;
};

const insertEventDish = async (
  tenantId: string,
  {
    eventId,
    dishId,
    quantityServings,
    specialInstructions,
  }: {
    eventId: string;
    dishId: string;
    quantityServings: number;
    specialInstructions?: string;
  }
) => {
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.event_dishes (
        tenant_id,
        id,
        event_id,
        dish_id,
        quantity_servings,
        special_instructions
      )
      VALUES (
        ${tenantId},
        ${randomUUID()},
        ${eventId},
        ${dishId},
        ${quantityServings},
        ${specialInstructions ?? null}
      )
    `
  );
};

const insertPrepTask = async (
  context: ImportContext,
  {
    eventId,
    dishId,
    name,
    quantityTotal,
    unit,
    servingsTotal,
    startByDate,
    dueByDate,
    isEventFinish,
    notes,
  }: {
    eventId: string;
    dishId?: string | null;
    name: string;
    quantityTotal: number;
    unit: string;
    servingsTotal?: number;
    startByDate: Date;
    dueByDate: Date;
    isEventFinish: boolean;
    notes?: string;
  }
) => {
  const unitId = unit.includes("pound") ? context.unitIds.pound : undefined;

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.prep_tasks (
        tenant_id,
        id,
        event_id,
        dish_id,
        location_id,
        task_type,
        name,
        quantity_total,
        quantity_unit_id,
        servings_total,
        start_by_date,
        due_by_date,
        is_event_finish,
        status,
        priority,
        notes
      )
      VALUES (
        ${context.tenantId},
        ${randomUUID()},
        ${eventId},
        ${dishId ?? null},
        ${context.locationId},
        ${"prep"},
        ${name},
        ${quantityTotal},
        ${unitId ?? null},
        ${servingsTotal ?? null},
        ${formatDate(startByDate)},
        ${formatDate(dueByDate)},
        ${isEventFinish},
        ${"pending"},
        ${5},
        ${notes ?? null}
      )
    `
  );
};

const getFileLabel = (fileName: string) =>
  fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

const importRows = async (
  rows: CsvRow[],
  context: ImportContext,
  {
    title,
    eventDate,
    notes,
    guestCount,
    mapRow,
  }: {
    title: string;
    eventDate: Date;
    notes?: string;
    guestCount: number;
    mapRow: (row: CsvRow) => {
      itemName: string;
      quantity: number;
      unit: string;
      servings: number;
      instructions?: string;
      isEventFinish: boolean;
    };
  }
) => {
  const eventId = await insertEvent(context.tenantId, {
    title,
    eventDate,
    eventType: "catering",
    guestCount,
    notes,
  });

  const recipeCache = new Map<string, string>();
  const dishCache = new Map<string, string>();
  const ingredientCache = new Map<string, string>();
  const inventoryCache = new Map<string, string>();
  const fallbackUnitId = await getFallbackUnitId();

  for (const row of rows) {
    const mapped = mapRow(row);
    const itemName = mapped.itemName.trim();
    if (!itemName) {
      continue;
    }

    const classification = classifyItem(itemName, mapped.unit);
    const itemKey = itemName.toLowerCase();

    if (classification.kind === "supply") {
      const existingId =
        inventoryCache.get(itemKey) ??
        (await insertInventoryItem(
          context.tenantId,
          itemName,
          classification.category ?? "supplies",
          classification.tags
        ));
      inventoryCache.set(itemKey, existingId);
      continue;
    }

    if (classification.kind === "ingredient") {
      if (!fallbackUnitId) {
        continue;
      }
      const ingredientId =
        ingredientCache.get(itemKey) ??
        (await insertIngredient(
          context.tenantId,
          itemName,
          context.unitIds.each ??
            context.unitIds.pound ??
            context.unitIds.ounce ??
            fallbackUnitId,
          classification.category
        ));
      ingredientCache.set(itemKey, ingredientId);

      await insertPrepTask(context, {
        eventId,
        dishId: null,
        name: itemName,
        quantityTotal: mapped.quantity,
        unit: mapped.unit,
        servingsTotal: mapped.servings,
        startByDate: addDays(eventDate, -2),
        dueByDate: eventDate,
        isEventFinish: mapped.isEventFinish,
        notes: mapped.instructions,
      });
      continue;
    }

    const recipeKey = itemKey;
    const recipeId =
      recipeCache.get(recipeKey) ??
      (await insertRecipe(context.tenantId, itemName, {
        category: classification.category ?? null,
        tags: classification.tags,
      }));
    recipeCache.set(recipeKey, recipeId);

    if (classification.kind === "recipe") {
      await insertPrepTask(context, {
        eventId,
        dishId: null,
        name: itemName,
        quantityTotal: mapped.quantity,
        unit: mapped.unit,
        servingsTotal: mapped.servings,
        startByDate: addDays(eventDate, -2),
        dueByDate: eventDate,
        isEventFinish: mapped.isEventFinish,
        notes: mapped.instructions,
      });
      continue;
    }

    const dishId =
      dishCache.get(itemKey) ??
      (await insertDish(
        context.tenantId,
        itemName,
        recipeId,
        classification.category
      ));
    dishCache.set(itemKey, dishId);

    await insertEventDish(context.tenantId, {
      eventId,
      dishId,
      quantityServings: Math.max(1, Math.round(mapped.servings)),
      specialInstructions: mapped.instructions,
    });

    await insertPrepTask(context, {
      eventId,
      dishId,
      name: itemName,
      quantityTotal: mapped.quantity,
      unit: mapped.unit,
      servingsTotal: mapped.servings,
      startByDate: addDays(eventDate, -2),
      dueByDate: eventDate,
      isEventFinish: mapped.isEventFinish,
      notes: mapped.instructions,
    });
  }

  return eventId;
};

export const importEventFromCsvText = async ({
  tenantId,
  fileName,
  content,
}: {
  tenantId: string;
  fileName: string;
  content: string;
}) => {
  const rows = parseCsv(content);
  if (rows.length === 0) {
    throw new Error("No rows found in CSV.");
  }

  const context: ImportContext = {
    tenantId,
    locationId: await ensureLocationId(tenantId),
    unitIds: await getUnitIds(),
  };

  const headers = Object.keys(rows[0] ?? {});
  const isPrepList =
    headers.includes("list_id") ||
    headers.includes("list_name") ||
    headers.includes("item_name");

  const now = new Date();

  if (isPrepList) {
    const groups = new Map<string, CsvRow[]>();
    rows.forEach((row) => {
      const listId = getValue(row, ["list_id"]) || getValue(row, ["list_name"]);
      if (!groups.has(listId)) {
        groups.set(listId, []);
      }
      groups.get(listId)?.push(row);
    });

    const firstGroup = Array.from(groups.values())[0] ?? [];
    const firstRow = firstGroup[0];
    const title =
      getValue(firstRow ?? {}, ["list_name"]) || getFileLabel(fileName);
    const eventDate = title.toLowerCase().includes("wedding")
      ? addDays(now, 45)
      : addDays(now, 14);

    const guestCount = Math.max(
      1,
      Math.round(
        Math.max(
          ...firstGroup.map((row) => {
            const unit = getValue(row, ["unit"]).toLowerCase();
            return unit.includes("serv") ? Number(row.quantity ?? 0) : 0;
          }),
          1
        )
      )
    );

    const eventId = await importRows(firstGroup, context, {
      title,
      eventDate,
      guestCount,
      notes: `Imported from ${fileName}`,
      mapRow: (row) => {
        const itemName =
          getValue(row, ["item_name"]) ||
          getValue(row, ["recipe_name"]) ||
          "Imported item";
        const quantity = Number(row.quantity ?? 0) || 1;
        const unit = getValue(row, ["unit"]).toLowerCase();
        const servings = unit.includes("serv") && quantity > 0 ? quantity : 1;
        const instructions = getValue(row, ["notes"]);
        const isEventFinish = getValue(row, ["finish_location"])
          .toLowerCase()
          .includes("event");

        return {
          itemName,
          quantity,
          unit,
          servings,
          instructions,
          isEventFinish,
        };
      },
    });

    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_events.event_imports (
          tenant_id,
          id,
          event_id,
          file_name,
          mime_type,
          file_size,
          content
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${eventId},
          ${fileName},
          ${"text/csv"},
          ${Buffer.byteLength(content)},
          ${Buffer.from(content)}
        )
      `
    );

    return eventId;
  }

  const title = getFileLabel(fileName);
  const eventDate = addDays(now, 10);
  const servings = Math.max(
    ...rows.map((row) => {
      const value = getValue(row, ["servings/batch", "servings batch"]);
      return parseNumber(value) ?? 0;
    }),
    1
  );

  const eventId = await importRows(rows, context, {
    title,
    eventDate,
    guestCount: Math.max(1, Math.round(servings)),
    notes: `Imported from ${fileName}`,
    mapRow: (row) => {
      const itemName = getValue(row, ["dish name"]) || "Imported dish";
      const servingsRaw = getValue(row, ["servings/batch", "servings batch"]);
      const { amount, unit } = parseQuantityUnit(
        getValue(row, ["quantity/unit", "quantity unit"])
      );
      const instructions = getValue(row, ["special instructions"]);
      const finishedAt = getValue(row, ["finished at"]).toLowerCase();

      return {
        itemName,
        quantity: amount ?? 1,
        unit,
        servings: parseNumber(servingsRaw) ?? 1,
        instructions,
        isEventFinish:
          finishedAt.includes("event") || finishedAt.includes("drop"),
      };
    },
  });

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.event_imports (
        tenant_id,
        id,
        event_id,
        file_name,
        mime_type,
        file_size,
        content
      )
      VALUES (
        ${tenantId},
        ${randomUUID()},
        ${eventId},
        ${fileName},
        ${"text/csv"},
        ${Buffer.byteLength(content)},
        ${Buffer.from(content)}
      )
    `
  );

  return eventId;
};

export const importEventFromPdf = async ({
  tenantId,
  fileName,
  content,
}: {
  tenantId: string;
  fileName: string;
  content: Buffer;
}) => {
  const title = getFileLabel(fileName);
  const eventDate = addDays(new Date(), 7);
  const eventId = await insertEvent(tenantId, {
    title,
    eventDate,
    eventType: "imported",
    guestCount: 1,
    notes: `PDF import placeholder for ${fileName}.`,
  });

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.event_imports (
        tenant_id,
        id,
        event_id,
        file_name,
        mime_type,
        file_size,
        content
      )
      VALUES (
        ${tenantId},
        ${randomUUID()},
        ${eventId},
        ${fileName},
        ${"application/pdf"},
        ${content.byteLength},
        ${content}
      )
    `
  );

  return eventId;
};
