-- Trimmed from `pnpm db:repair` output 2026-07-05: kept ONLY the generatedAt
-- default (PrepList source now declares `= now()` because the engine persists
-- auto-created instances before mutates run). Accepted upstream projection
-- drift NOT folded (see 20260704222148_repair_drift header).

ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "generated_at" SET DEFAULT now();
