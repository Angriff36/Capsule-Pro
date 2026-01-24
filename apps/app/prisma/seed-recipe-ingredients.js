Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@repo/database");
const prisma = database_1.database;
// Tenant ID - replace with actual tenant ID
const TENANT_ID = "00000000-0000-0000-0000-000000000001";
async function main() {
  console.log("Starting seed for recipe ingredients...");
  // Get existing recipe versions
  const recipeVersions = await prisma.$queryRaw`
    SELECT rv.id, rv.recipe_id, r.name
    FROM tenant_kitchen.recipe_versions rv
    JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
    WHERE rv.tenant_id = ${TENANT_ID}::uuid
      AND rv.deleted_at IS NULL
      AND r.deleted_at IS NULL
    ORDER BY r.name, rv.version_number DESC
  `;
  console.log(`Found ${recipeVersions.length} recipe versions`);
  // Get existing ingredients
  const ingredients = await prisma.$queryRaw`
    SELECT id, name, category
    FROM tenant_kitchen.ingredients
    WHERE tenant_id = ${TENANT_ID}::uuid
      AND deleted_at IS NULL
    ORDER BY name
  `;
  console.log(`Found ${ingredients.length} ingredients`);
  // Get existing units
  const units = await prisma.$queryRaw`
    SELECT id, code FROM core.units ORDER BY id
  `;
  console.log(`Found ${units.length} units`);
  // Create ingredient map
  const ingredientMap = new Map();
  const unitMap = new Map(units.map((u) => [u.code, u.id]));
  const commonIngredients = [
    { name: "Chicken Breast", category: "Protein" },
    { name: "Olive Oil", category: "Pantry" },
    { name: "Fresh Herbs", category: "Produce" },
    { name: "Garlic", category: "Produce" },
    { name: "Salt", category: "Pantry" },
    { name: "Black Pepper", category: "Pantry" },
    { name: "Beef Roast", category: "Protein" },
    { name: "Beef Stock", category: "Pantry" },
    { name: "Potatoes", category: "Produce" },
    { name: "Butter", category: "Dairy" },
    { name: "Heavy Cream", category: "Dairy" },
    { name: "Carrots", category: "Produce" },
    { name: "Asparagus", category: "Produce" },
    { name: "Romaine Lettuce", category: "Produce" },
    { name: "Parmesan Cheese", category: "Dairy" },
    { name: "Croutons", category: "Bakery" },
    { name: "Mayonnaise", category: "Pantry" },
    { name: "Dijon Mustard", category: "Pantry" },
    { name: "Lemon Juice", category: "Produce" },
    { name: "Worcestershire Sauce", category: "Pantry" },
    { name: "Dinner Rolls", category: "Bakery" },
    { name: "Chocolate", category: "Pantry" },
    { name: "Eggs", category: "Dairy" },
    { name: "Sugar", category: "Pantry" },
    { name: "Vanilla Extract", category: "Pantry" },
    { name: "Fruit Assortment", category: "Produce" },
  ];
  // Insert common ingredients
  for (const ing of commonIngredients) {
    const existing = ingredients.find(
      (i) => i.name.toLowerCase() === ing.name.toLowerCase()
    );
    if (existing) {
      ingredientMap.set(ing.name, existing.id);
    } else {
      try {
        const newIng = await prisma.$queryRaw`
          INSERT INTO tenant_kitchen.ingredients (tenant_id, id, name, category, default_unit_id, is_active)
          VALUES (${TENANT_ID}::uuid, gen_random_uuid(), ${ing.name}, ${ing.category}, 1, true)
          RETURNING id
        `;
        if (newIng.length > 0) {
          ingredientMap.set(ing.name, newIng[0].id);
        }
      } catch (e) {
        // Ignore duplicates
      }
    }
  }
  console.log(`Created/found ${ingredientMap.size} ingredients`);
  // Define recipe ingredients for each recipe
  const recipeIngredientData = {
    "Grilled Herb Chicken": [
      { name: "Chicken Breast", quantity: 1, unit: "lb" },
      { name: "Olive Oil", quantity: 2, unit: "tbsp" },
      { name: "Fresh Herbs", quantity: 2, unit: "tbsp" },
      { name: "Garlic", quantity: 3, unit: "clove" },
      { name: "Salt", quantity: 1, unit: "tsp" },
      { name: "Black Pepper", quantity: 0.5, unit: "tsp" },
    ],
    "Roast Beef au Jus": [
      { name: "Beef Roast", quantity: 5, unit: "lb" },
      { name: "Garlic", quantity: 4, unit: "clove" },
      { name: "Olive Oil", quantity: 2, unit: "tbsp" },
      { name: "Beef Stock", quantity: 2, unit: "cup" },
      { name: "Salt", quantity: 1, unit: "tbsp" },
      { name: "Black Pepper", quantity: 1, unit: "tsp" },
    ],
    "Mashed Potatoes": [
      { name: "Potatoes", quantity: 3, unit: "lb" },
      { name: "Butter", quantity: 0.5, unit: "cup" },
      { name: "Heavy Cream", quantity: 0.25, unit: "cup" },
      { name: "Salt", quantity: 1, unit: "tsp" },
      { name: "Black Pepper", quantity: 0.25, unit: "tsp" },
    ],
    "Seasonal Vegetables": [
      { name: "Carrots", quantity: 1, unit: "lb" },
      { name: "Asparagus", quantity: 1, unit: "lb" },
      { name: "Olive Oil", quantity: 2, unit: "tbsp" },
      { name: "Salt", quantity: 0.5, unit: "tsp" },
      { name: "Black Pepper", quantity: 0.25, unit: "tsp" },
    ],
    "Caesar Salad": [
      { name: "Romaine Lettuce", quantity: 2, unit: "head" },
      { name: "Parmesan Cheese", quantity: 0.5, unit: "cup" },
      { name: "Croutons", quantity: 1, unit: "cup" },
      { name: "Mayonnaise", quantity: 0.5, unit: "cup" },
      { name: "Dijon Mustard", quantity: 1, unit: "tbsp" },
      { name: "Lemon Juice", quantity: 2, unit: "tbsp" },
      { name: "Garlic", quantity: 1, unit: "clove" },
    ],
    "Compound Butter": [
      { name: "Butter", quantity: 1, unit: "cup" },
      { name: "Fresh Herbs", quantity: 2, unit: "tbsp" },
      { name: "Garlic", quantity: 1, unit: "clove" },
    ],
    "Chocolate Mousse": [
      { name: "Chocolate", quantity: 8, unit: "oz" },
      { name: "Eggs", quantity: 3, unit: "whole" },
      { name: "Sugar", quantity: 0.25, unit: "cup" },
      { name: "Heavy Cream", quantity: 1, unit: "cup" },
      { name: "Vanilla Extract", quantity: 1, unit: "tsp" },
    ],
    "Fruit Platter": [{ name: "Fruit Assortment", quantity: 4, unit: "lb" }],
  };
  // Find recipe versions for each dish and add ingredients
  let ingredientsAdded = 0;
  for (const rv of recipeVersions) {
    const recipeName = rv.name;
    const recipeIngredients = recipeIngredientData[recipeName];
    if (!recipeIngredients) {
      console.log(`No ingredient data for recipe: ${recipeName}`);
      continue;
    }
    for (const ri of recipeIngredients) {
      const ingredientId = ingredientMap.get(ri.name);
      const unitId = unitMap.get(ri.unit);
      if (!(ingredientId && unitId)) {
        console.log(`Missing ingredient or unit: ${ri.name} / ${ri.unit}`);
        continue;
      }
      // Check if this recipe ingredient already exists
      const existing = await prisma.$queryRaw`
        SELECT id FROM tenant_kitchen.recipe_ingredients
        WHERE tenant_id = ${TENANT_ID}::uuid
          AND recipe_version_id = ${rv.id}::uuid
          AND ingredient_id = ${ingredientId}::uuid
          AND deleted_at IS NULL
      `;
      if (existing.length === 0) {
        try {
          await prisma.$executeRaw`
            INSERT INTO tenant_kitchen.recipe_ingredients (
              tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id,
              is_optional, sort_order, waste_factor, adjusted_quantity
            ) VALUES (
              ${TENANT_ID}::uuid, gen_random_uuid(), ${rv.id}::uuid, ${ingredientId}::uuid,
              ${ri.quantity}, ${unitId}, false, 0, 1.0, ${ri.quantity}
            )
          `;
          ingredientsAdded++;
        } catch (e) {
          // Ignore errors (likely duplicates)
        }
      }
    }
  }
  console.log(`Added ${ingredientsAdded} recipe ingredients`);
  console.log("Seed completed!");
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
