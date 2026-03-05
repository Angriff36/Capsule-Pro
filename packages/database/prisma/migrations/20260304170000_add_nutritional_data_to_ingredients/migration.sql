-- Add nutritional data fields to ingredients
-- This enables recipe optimization with nutritional analysis

ALTER TABLE "tenant_kitchen"."ingredients"
ADD COLUMN "calories_per_100g" INTEGER,
ADD COLUMN "protein_per_100g" DECIMAL(10, 2),
ADD COLUMN "carbohydrates_per_100g" DECIMAL(10, 2),
ADD COLUMN "fat_per_100g" DECIMAL(10, 2),
ADD COLUMN "fiber_per_100g" DECIMAL(10, 2),
ADD COLUMN "sugar_per_100g" DECIMAL(10, 2),
ADD COLUMN "sodium_per_100mg" DECIMAL(10, 2),
ADD COLUMN "cholesterol_per_100mg" DECIMAL(10, 2);
