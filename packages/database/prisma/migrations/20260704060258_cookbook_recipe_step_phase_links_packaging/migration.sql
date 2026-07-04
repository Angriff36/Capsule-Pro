-- CreateEnum
CREATE TYPE "RecipeStepPhase" AS ENUM ('prep', 'method', 'finish', 'packaging');

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipes" ADD COLUMN     "is_subrecipe" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_steps" ADD COLUMN     "linked_recipe_id" TEXT DEFAULT '',
ADD COLUMN     "linked_technique_id" TEXT DEFAULT '',
ADD COLUMN     "phase" "RecipeStepPhase" DEFAULT 'method';

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_versions" ADD COLUMN     "bring_hot_notes" TEXT DEFAULT '',
ADD COLUMN     "cook_on_site_notes" TEXT DEFAULT '',
ADD COLUMN     "drop_off_notes" TEXT DEFAULT '';
