-- Seed Recipe Ingredients for Wedding Reception event
-- Tenant ID: 00000000-0000-0000-0000-000000000001

-- First, insert common ingredients if they don't exist
INSERT INTO tenant_kitchen.ingredients (tenant_id, id, name, category, default_unit_id, is_active)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  gen_random_uuid(),
  name,
  category,
  1,
  true
FROM (VALUES
  ('Chicken Breast', 'Protein'),
  ('Olive Oil', 'Pantry'),
  ('Fresh Herbs', 'Produce'),
  ('Garlic', 'Produce'),
  ('Salt', 'Pantry'),
  ('Black Pepper', 'Pantry'),
  ('Beef Roast', 'Protein'),
  ('Beef Stock', 'Pantry'),
  ('Potatoes', 'Produce'),
  ('Butter', 'Dairy'),
  ('Heavy Cream', 'Dairy'),
  ('Carrots', 'Produce'),
  ('Asparagus', 'Produce'),
  ('Romaine Lettuce', 'Produce'),
  ('Parmesan Cheese', 'Dairy'),
  ('Croutons', 'Bakery'),
  ('Mayonnaise', 'Pantry'),
  ('Dijon Mustard', 'Pantry'),
  ('Lemon Juice', 'Produce'),
  ('Worcestershire Sauce', 'Pantry'),
  ('Chocolate', 'Pantry'),
  ('Eggs', 'Dairy'),
  ('Sugar', 'Pantry'),
  ('Vanilla Extract', 'Pantry'),
  ('Fruit Assortment', 'Produce')
) AS t(name, category)
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_kitchen.ingredients i
  WHERE i.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND i.name = t.name
    AND i.deleted_at IS NULL
);

-- Get ingredient IDs
DO $$
DECLARE
  ing_chicken_breast UUID;
  ing_olive_oil UUID;
  ing_fresh_herbs UUID;
  ing_garlic UUID;
  ing_salt UUID;
  ing_black_pepper UUID;
  ing_beef_roast UUID;
  ing_beef_stock UUID;
  ing_potatoes UUID;
  ing_butter UUID;
  ing_heavy_cream UUID;
  ing_carrots UUID;
  ing_asparagus UUID;
  ing_romaine UUID;
  ing_parmesan UUID;
  ing_croutons UUID;
  ing_mayonnaise UUID;
  ing_dijon UUID;
  ing_lemon_juice UUID;
  ing_chocolate UUID;
  ing_eggs UUID;
  ing_sugar UUID;
  ing_vanilla UUID;
  ing_fruit UUID;

  rv_chicken UUID;
  rv_beef UUID;
  rv_potatoes UUID;
  rv_vegetables UUID;
  rv_caesar UUID;
  rv_butter UUID;
  rv_mousse UUID;
  rv_fruit UUID;

  unit_lb INTEGER;
  unit_tbsp INTEGER;
  unit_tsp INTEGER;
  unit_clove INTEGER;
  unit_cup INTEGER;
  unit_oz INTEGER;
  unit_head INTEGER;
  unit_whole INTEGER;
BEGIN
  -- Get unit IDs
  SELECT id INTO unit_lb FROM core.units WHERE code = 'lb';
  SELECT id INTO unit_tbsp FROM core.units WHERE code = 'tbsp';
  SELECT id INTO unit_tsp FROM core.units WHERE code = 'tsp';
  SELECT id INTO unit_clove FROM core.units WHERE code = 'clove';
  SELECT id INTO unit_cup FROM core.units WHERE code = 'cup';
  SELECT id INTO unit_oz FROM core.units WHERE code = 'oz';
  SELECT id INTO unit_head FROM core.units WHERE code = 'head';
  SELECT id INTO unit_whole FROM core.units WHERE code = 'whole';

  -- Get ingredient IDs
  SELECT id INTO ing_chicken_breast FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Chicken Breast' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_olive_oil FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Olive Oil' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_fresh_herbs FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Fresh Herbs' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_garlic FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Garlic' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_salt FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Salt' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_black_pepper FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Black Pepper' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_beef_roast FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Beef Roast' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_beef_stock FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Beef Stock' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_potatoes FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Potatoes' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_butter FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Butter' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_heavy_cream FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Heavy Cream' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_carrots FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Carrots' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_asparagus FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Asparagus' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_romaine FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Romaine Lettuce' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_parmesan FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Parmesan Cheese' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_croutons FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Croutons' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_mayonnaise FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Mayonnaise' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_dijon FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Dijon Mustard' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_lemon_juice FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Lemon Juice' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_chocolate FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Chocolate' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_eggs FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Eggs' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_sugar FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Sugar' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_vanilla FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Vanilla Extract' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ing_fruit FROM tenant_kitchen.ingredients WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Fruit Assortment' AND deleted_at IS NULL LIMIT 1;

  -- Get recipe version IDs (latest version for each recipe)
  SELECT rv.id INTO rv_chicken
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Grilled Herb Chicken'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  SELECT rv.id INTO rv_beef
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Roast Beef au Jus'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  SELECT rv.id INTO rv_potatoes
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Mashed Potatoes'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  SELECT rv.id INTO rv_vegetables
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Seasonal Vegetables'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  SELECT rv.id INTO rv_caesar
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Caesar Salad'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  SELECT rv.id INTO rv_butter
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Compound Butter'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  SELECT rv.id INTO rv_mousse
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Chocolate Mousse'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  SELECT rv.id INTO rv_fruit
  FROM tenant_kitchen.recipe_versions rv
  JOIN tenant_kitchen.recipes r ON r.id = rv.recipe_id AND r.tenant_id = rv.tenant_id
  WHERE rv.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND r.name = 'Fruit Platter'
    AND rv.deleted_at IS NULL
    ORDER BY rv.version_number DESC LIMIT 1;

  -- Insert recipe ingredients for Grilled Herb Chicken
  IF rv_chicken IS NOT NULL AND ing_chicken_breast IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_chicken, ing_chicken_breast, 1, unit_lb, false, 0, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_chicken AND ingredient_id = ing_chicken_breast AND deleted_at IS NULL);
  END IF;

  IF rv_chicken IS NOT NULL AND ing_olive_oil IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_chicken, ing_olive_oil, 2, unit_tbsp, false, 1, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_chicken AND ingredient_id = ing_olive_oil AND deleted_at IS NULL);
  END IF;

  IF rv_chicken IS NOT NULL AND ing_fresh_herbs IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_chicken, ing_fresh_herbs, 2, unit_tbsp, false, 2, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_chicken AND ingredient_id = ing_fresh_herbs AND deleted_at IS NULL);
  END IF;

  IF rv_chicken IS NOT NULL AND ing_garlic IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_chicken, ing_garlic, 3, unit_clove, false, 3, 1.0, 3
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_chicken AND ingredient_id = ing_garlic AND deleted_at IS NULL);
  END IF;

  IF rv_chicken IS NOT NULL AND ing_salt IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_chicken, ing_salt, 1, unit_tsp, false, 4, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_chicken AND ingredient_id = ing_salt AND deleted_at IS NULL);
  END IF;

  IF rv_chicken IS NOT NULL AND ing_black_pepper IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_chicken, ing_black_pepper, 0.5, unit_tsp, false, 5, 1.0, 0.5
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_chicken AND ingredient_id = ing_black_pepper AND deleted_at IS NULL);
  END IF;

  -- Insert recipe ingredients for Roast Beef au Jus
  IF rv_beef IS NOT NULL AND ing_beef_roast IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_beef, ing_beef_roast, 5, unit_lb, false, 0, 1.0, 5
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_beef AND ingredient_id = ing_beef_roast AND deleted_at IS NULL);
  END IF;

  IF rv_beef IS NOT NULL AND ing_garlic IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_beef, ing_garlic, 4, unit_clove, false, 1, 1.0, 4
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_beef AND ingredient_id = ing_garlic AND deleted_at IS NULL);
  END IF;

  IF rv_beef IS NOT NULL AND ing_olive_oil IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_beef, ing_olive_oil, 2, unit_tbsp, false, 2, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_beef AND ingredient_id = ing_olive_oil AND deleted_at IS NULL);
  END IF;

  IF rv_beef IS NOT NULL AND ing_beef_stock IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_beef, ing_beef_stock, 2, unit_cup, false, 3, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_beef AND ingredient_id = ing_beef_stock AND deleted_at IS NULL);
  END IF;

  -- Insert recipe ingredients for Mashed Potatoes
  IF rv_potatoes IS NOT NULL AND ing_potatoes IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_potatoes, ing_potatoes, 3, unit_lb, false, 0, 1.0, 3
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_potatoes AND ingredient_id = ing_potatoes AND deleted_at IS NULL);
  END IF;

  IF rv_potatoes IS NOT NULL AND ing_butter IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_potatoes, ing_butter, 0.5, unit_cup, false, 1, 1.0, 0.5
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_potatoes AND ingredient_id = ing_butter AND deleted_at IS NULL);
  END IF;

  IF rv_potatoes IS NOT NULL AND ing_heavy_cream IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_potatoes, ing_heavy_cream, 0.25, unit_cup, false, 2, 1.0, 0.25
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_potatoes AND ingredient_id = ing_heavy_cream AND deleted_at IS NULL);
  END IF;

  -- Insert recipe ingredients for Seasonal Vegetables
  IF rv_vegetables IS NOT NULL AND ing_carrots IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_vegetables, ing_carrots, 1, unit_lb, false, 0, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_vegetables AND ingredient_id = ing_carrots AND deleted_at IS NULL);
  END IF;

  IF rv_vegetables IS NOT NULL AND ing_asparagus IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_vegetables, ing_asparagus, 1, unit_lb, false, 1, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_vegetables AND ingredient_id = ing_asparagus AND deleted_at IS NULL);
  END IF;

  IF rv_vegetables IS NOT NULL AND ing_olive_oil IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_vegetables, ing_olive_oil, 2, unit_tbsp, false, 2, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_vegetables AND ingredient_id = ing_olive_oil AND deleted_at IS NULL);
  END IF;

  -- Insert recipe ingredients for Caesar Salad
  IF rv_caesar IS NOT NULL AND ing_romaine IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_caesar, ing_romaine, 2, unit_head, false, 0, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_caesar AND ingredient_id = ing_romaine AND deleted_at IS NULL);
  END IF;

  IF rv_caesar IS NOT NULL AND ing_parmesan IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_caesar, ing_parmesan, 0.5, unit_cup, false, 1, 1.0, 0.5
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_caesar AND ingredient_id = ing_parmesan AND deleted_at IS NULL);
  END IF;

  IF rv_caesar IS NOT NULL AND ing_croutons IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_caesar, ing_croutons, 1, unit_cup, false, 2, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_caesar AND ingredient_id = ing_croutons AND deleted_at IS NULL);
  END IF;

  IF rv_caesar IS NOT NULL AND ing_mayonnaise IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_caesar, ing_mayonnaise, 0.5, unit_cup, false, 3, 1.0, 0.5
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_caesar AND ingredient_id = ing_mayonnaise AND deleted_at IS NULL);
  END IF;

  IF rv_caesar IS NOT NULL AND ing_dijon IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_caesar, ing_dijon, 1, unit_tbsp, false, 4, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_caesar AND ingredient_id = ing_dijon AND deleted_at IS NULL);
  END IF;

  IF rv_caesar IS NOT NULL AND ing_lemon_juice IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_caesar, ing_lemon_juice, 2, unit_tbsp, false, 5, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_caesar AND ingredient_id = ing_lemon_juice AND deleted_at IS NULL);
  END IF;

  IF rv_caesar IS NOT NULL AND ing_garlic IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_caesar, ing_garlic, 1, unit_clove, false, 6, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_caesar AND ingredient_id = ing_garlic AND deleted_at IS NULL);
  END IF;

  -- Insert recipe ingredients for Chocolate Mousse
  IF rv_mousse IS NOT NULL AND ing_chocolate IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_mousse, ing_chocolate, 8, unit_oz, false, 0, 1.0, 8
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_mousse AND ingredient_id = ing_chocolate AND deleted_at IS NULL);
  END IF;

  IF rv_mousse IS NOT NULL AND ing_eggs IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_mousse, ing_eggs, 3, unit_whole, false, 1, 1.0, 3
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_mousse AND ingredient_id = ing_eggs AND deleted_at IS NULL);
  END IF;

  IF rv_mousse IS NOT NULL AND ing_sugar IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_mousse, ing_sugar, 0.25, unit_cup, false, 2, 1.0, 0.25
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_mousse AND ingredient_id = ing_sugar AND deleted_at IS NULL);
  END IF;

  IF rv_mousse IS NOT NULL AND ing_heavy_cream IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_mousse, ing_heavy_cream, 1, unit_cup, false, 3, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_mousse AND ingredient_id = ing_heavy_cream AND deleted_at IS NULL);
  END IF;

  IF rv_mousse IS NOT NULL AND ing_vanilla IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_mousse, ing_vanilla, 1, unit_tsp, false, 4, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_mousse AND ingredient_id = ing_vanilla AND deleted_at IS NULL);
  END IF;

  -- Insert recipe ingredients for Fruit Platter
  IF rv_fruit IS NOT NULL AND ing_fruit IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_fruit, ing_fruit, 4, unit_lb, false, 0, 1.0, 4
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_fruit AND ingredient_id = ing_fruit AND deleted_at IS NULL);
  END IF;

  -- Insert recipe ingredients for Compound Butter
  IF rv_butter IS NOT NULL AND ing_butter IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_butter, ing_butter, 1, unit_cup, false, 0, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_butter AND ingredient_id = ing_butter AND deleted_at IS NULL);
  END IF;

  IF rv_butter IS NOT NULL AND ing_fresh_herbs IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_butter, ing_fresh_herbs, 2, unit_tbsp, false, 1, 1.0, 2
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_butter AND ingredient_id = ing_fresh_herbs AND deleted_at IS NULL);
  END IF;

  IF rv_butter IS NOT NULL AND ing_garlic IS NOT NULL THEN
    INSERT INTO tenant_kitchen.recipe_ingredients (tenant_id, id, recipe_version_id, ingredient_id, quantity, unit_id, is_optional, sort_order, waste_factor, adjusted_quantity)
    SELECT '00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), rv_butter, ing_garlic, 1, unit_clove, false, 2, 1.0, 1
    WHERE NOT EXISTS (SELECT 1 FROM tenant_kitchen.recipe_ingredients WHERE recipe_version_id = rv_butter AND ingredient_id = ing_garlic AND deleted_at IS NULL);
  END IF;

  RAISE NOTICE 'Recipe ingredients seeded successfully!';
END $$;
