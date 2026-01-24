"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.createDish = exports.updateRecipeImage = exports.createRecipe = void 0;
const database_1 = require("@repo/database");
const storage_1 = require("@repo/storage");
const crypto_1 = require("crypto");
const cache_1 = require("next/cache");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../lib/tenant");
const parseList = (value) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
const parseNumber = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const parseLines = (value) =>
  typeof value === "string"
    ? value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
const readImageFile = (formData, key) => {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Image must be an image file.");
  }
  return file;
};
const uploadImage = async (tenantId, pathPrefix, file) => {
  const filename = file.name?.trim() || "image";
  const blob = await (0, storage_1.put)(
    `tenants/${tenantId}/${pathPrefix}/${filename}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    }
  );
  return blob.url;
};
const enqueueOutboxEvent = async (
  tenantId,
  aggregateType,
  aggregateId,
  eventType,
  payload
) => {
  await database_1.database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType,
      aggregateId,
      eventType,
      payload,
    },
  });
};
const loadUnitMap = async (codes) => {
  if (codes.length === 0) {
    return new Map();
  }
  const rows = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, code
      FROM core.units
      WHERE code IN (${database_1.Prisma.join(codes)})
    `);
  return new Map(rows.map((row) => [row.code.toLowerCase(), row.id]));
};
const ensureIngredientId = async (tenantId, name, defaultUnitId) => {
  const [existing] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `);
  if (existing?.id) {
    return existing.id;
  }
  const id = (0, crypto_1.randomUUID)();
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        default_unit_id,
        is_active
      )
      VALUES (${tenantId}, ${id}, ${name}, ${defaultUnitId}, true)
    `);
  return id;
};
const parseIngredientLine = (line) => {
  const match = line.match(/^([\d.]+)\s*([a-zA-Z]+)?\s*(.*)$/);
  if (!match) {
    return { quantity: 1, unit: null, name: line };
  }
  const quantity = Number(match[1]);
  const unit = match[2] ? match[2].toLowerCase() : null;
  const name = match[3]?.trim() || line;
  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit,
    name,
  };
};
const createRecipe = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Recipe name is required.");
  }
  const category = String(formData.get("category") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const tags = parseList(formData.get("tags"));
  const yieldQuantity = parseNumber(formData.get("yieldQuantity"));
  const yieldUnit = String(formData.get("yieldUnit") || "").trim();
  const yieldDescription =
    String(formData.get("yieldDescription") || "").trim() || null;
  const prepTime = parseNumber(formData.get("prepTimeMinutes"));
  const cookTime = parseNumber(formData.get("cookTimeMinutes"));
  const restTime = parseNumber(formData.get("restTimeMinutes"));
  const difficulty = parseNumber(formData.get("difficultyLevel"));
  const notes = String(formData.get("notes") || "").trim() || null;
  const imageFile = readImageFile(formData, "imageFile");
  const hasImageFile = Boolean(imageFile);
  const ingredientLines = parseLines(formData.get("ingredients"));
  const rawStepLines = parseLines(formData.get("steps"));
  const stepLines =
    rawStepLines.length === 0 && hasImageFile
      ? ["Reference photo"]
      : rawStepLines;
  const unitsMap = await loadUnitMap(
    [
      yieldUnit,
      ...ingredientLines.map((line) => parseIngredientLine(line).unit),
    ]
      .filter(Boolean)
      .map((value) => value)
  );
  const fallbackUnitId =
    unitsMap.get(yieldUnit.toLowerCase()) ??
    (
      await database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT id
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `)
    )[0]?.id;
  if (!fallbackUnitId) {
    throw new Error("No units configured in core.units.");
  }
  const recipeId = (0, crypto_1.randomUUID)();
  const recipeVersionId = (0, crypto_1.randomUUID)();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `recipes/${recipeId}/hero`, imageFile)
    : null;
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      INSERT INTO tenant_kitchen.recipes (
        tenant_id,
        id,
        name,
        category,
        description,
        tags,
        is_active
      )
      VALUES (
        ${tenantId},
        ${recipeId},
        ${name},
        ${category},
        ${description},
        ${tags.length > 0 ? tags : null},
        true
      )
    `);
  const safeYieldQuantity =
    yieldQuantity && yieldQuantity > 0 ? yieldQuantity : 1;
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      INSERT INTO tenant_kitchen.recipe_versions (
        tenant_id,
        id,
        recipe_id,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        notes
      )
      VALUES (
        ${tenantId},
        ${recipeVersionId},
        ${recipeId},
        ${safeYieldQuantity},
        ${unitsMap.get(yieldUnit.toLowerCase()) ?? fallbackUnitId},
        ${yieldDescription},
        ${prepTime},
        ${cookTime},
        ${restTime},
        ${difficulty},
        ${notes}
      )
    `);
  for (const [index, line] of ingredientLines.entries()) {
    const parsed = parseIngredientLine(line);
    const ingredientName = parsed.name || line;
    const unitId =
      (parsed.unit ? unitsMap.get(parsed.unit) : undefined) ?? fallbackUnitId;
    const ingredientId = await ensureIngredientId(
      tenantId,
      ingredientName,
      unitId
    );
    await database_1.database.$executeRaw(database_1.Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_ingredients (
          tenant_id,
          id,
          recipe_version_id,
          ingredient_id,
          quantity,
          unit_id,
          sort_order
        )
        VALUES (
          ${tenantId},
          ${(0, crypto_1.randomUUID)()},
          ${recipeVersionId},
          ${ingredientId},
          ${parsed.quantity},
          ${unitId},
          ${index + 1}
        )
      `);
  }
  for (const [index, instruction] of stepLines.entries()) {
    await database_1.database.$executeRaw(database_1.Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_steps (
          tenant_id,
          id,
          recipe_version_id,
          step_number,
          instruction,
          image_url
        )
        VALUES (
          ${tenantId},
          ${(0, crypto_1.randomUUID)()},
          ${recipeVersionId},
          ${index + 1},
          ${instruction},
          ${index === 0 ? imageUrl : null}
        )
      `);
  }
  (0, cache_1.revalidatePath)("/kitchen/recipes");
  await enqueueOutboxEvent(tenantId, "recipe", recipeId, "recipe.created", {
    recipeId,
    imageUrl,
  });
  (0, navigation_1.redirect)("/kitchen/recipes");
};
exports.createRecipe = createRecipe;
const updateRecipeImage = async (recipeId, formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  if (!recipeId) {
    throw new Error("Recipe id is required.");
  }
  const imageFile = readImageFile(formData, "imageFile");
  if (!imageFile) {
    return;
  }
  const imageUrl = await uploadImage(
    tenantId,
    `recipes/${recipeId}/hero`,
    imageFile
  );
  const [version] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
        AND deleted_at IS NULL
      ORDER BY version_number DESC
      LIMIT 1
    `);
  let versionId = version?.id;
  if (!versionId) {
    const [maxVersion] = await database_1.database.$queryRaw(database_1.Prisma
      .sql`
        SELECT MAX(version_number)::int AS max
        FROM tenant_kitchen.recipe_versions
        WHERE tenant_id = ${tenantId}
          AND recipe_id = ${recipeId}
      `);
    const [fallbackUnit] = await database_1.database.$queryRaw(database_1.Prisma
      .sql`
        SELECT id
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `);
    if (!fallbackUnit?.id) {
      throw new Error("No units configured in core.units.");
    }
    versionId = (0, crypto_1.randomUUID)();
    await database_1.database.$executeRaw(database_1.Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_versions (
          tenant_id,
          id,
          recipe_id,
          version_number,
          yield_quantity,
          yield_unit_id
        )
        VALUES (
          ${tenantId},
          ${versionId},
          ${recipeId},
          ${(maxVersion?.max ?? 0) + 1},
          1,
          ${fallbackUnit.id}
        )
      `);
  }
  const [step] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_steps
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${versionId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
      LIMIT 1
    `);
  if (step?.id) {
    await database_1.database.$executeRaw(database_1.Prisma.sql`
        UPDATE tenant_kitchen.recipe_steps
        SET image_url = ${imageUrl}
        WHERE tenant_id = ${tenantId}
          AND id = ${step.id}
      `);
  } else {
    await database_1.database.$executeRaw(database_1.Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_steps (
          tenant_id,
          id,
          recipe_version_id,
          step_number,
          instruction,
          image_url
        )
        VALUES (
          ${tenantId},
          ${(0, crypto_1.randomUUID)()},
          ${versionId},
          1,
          'Reference photo',
          ${imageUrl}
        )
      `);
  }
  (0, cache_1.revalidatePath)("/kitchen/recipes");
  await enqueueOutboxEvent(
    tenantId,
    "recipe",
    recipeId,
    "recipe.image.updated",
    {
      recipeId,
      imageUrl,
    }
  );
};
exports.updateRecipeImage = updateRecipeImage;
const createDish = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const name = String(formData.get("name") || "").trim();
  const recipeId = String(formData.get("recipeId") || "").trim();
  if (!(name && recipeId)) {
    throw new Error("Dish name and recipe are required.");
  }
  const category = String(formData.get("category") || "").trim() || null;
  const serviceStyle =
    String(formData.get("serviceStyle") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const imageFile = readImageFile(formData, "imageFile");
  const dietaryTags = parseList(formData.get("dietaryTags"));
  const allergens = parseList(formData.get("allergens"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const costPerPerson = parseNumber(formData.get("costPerPerson"));
  const minLead = parseNumber(formData.get("minPrepLeadDays"));
  const maxLead = parseNumber(formData.get("maxPrepLeadDays"));
  const portionSize =
    String(formData.get("portionSizeDescription") || "").trim() || null;
  const dishId = (0, crypto_1.randomUUID)();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `dishes/${dishId}/hero`, imageFile)
    : null;
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      INSERT INTO tenant_kitchen.dishes (
        tenant_id,
        id,
        recipe_id,
        name,
        description,
        category,
        service_style,
        presentation_image_url,
        dietary_tags,
        allergens,
        price_per_person,
        cost_per_person,
        min_prep_lead_days,
        max_prep_lead_days,
        portion_size_description,
        is_active
      )
      VALUES (
        ${tenantId},
        ${dishId},
        ${recipeId},
        ${name},
        ${description},
        ${category},
        ${serviceStyle},
        ${imageUrl},
        ${dietaryTags.length > 0 ? dietaryTags : null},
        ${allergens.length > 0 ? allergens : null},
        ${pricePerPerson},
        ${costPerPerson},
        ${minLead ?? 0},
        ${maxLead},
        ${portionSize},
        true
      )
    `);
  (0, cache_1.revalidatePath)("/kitchen/recipes");
  (0, navigation_1.redirect)("/kitchen/recipes?tab=dishes");
};
exports.createDish = createDish;
