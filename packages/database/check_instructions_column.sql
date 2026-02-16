-- Check if instructions column exists in recipe_versions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'tenant_kitchen'
  AND table_name = 'recipe_versions'
  AND column_name = 'instructions';
