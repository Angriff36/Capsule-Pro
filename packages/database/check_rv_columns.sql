-- Check columns in tenant_kitchen.recipe_versions (the table behind alias 'rv')
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'tenant_kitchen'
  AND table_name = 'recipe_versions'
ORDER BY ordinal_position;
